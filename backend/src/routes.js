import { Router } from "express";
import { store } from "./store.js";
import { evaluateAnswers, generateQuestions } from "./gemini.js";

const router = Router();

function jobPayload(job) {
  return {
    ...job,
    questions: store.questionsForJob(job.id),
    candidates: store.listCandidates().filter((candidate) => candidate.jobId === job.id),
  };
}

function candidateWithJob(candidate) {
  const job = store.getJob(candidate.jobId);
  return { ...candidate, job };
}

router.get("/jobs", (_req, res) => {
  res.json(store.listJobs().map(jobPayload));
});

router.post("/jobs", (req, res) => {
  const { title, skills, level } = req.body || {};
  const skillList = Array.isArray(skills)
    ? skills
    : String(skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
  if (!title || !skillList.length) {
    return res.status(400).json({ error: "title and at least one skill are required" });
  }
  const job = store.createJob({ title, skills: skillList, level });
  res.status(201).json(jobPayload(job));
});

router.get("/jobs/:id", (req, res) => {
  const job = store.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(jobPayload(job));
});

router.post("/jobs/:id/generate-questions", async (req, res, next) => {
  try {
    const job = store.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const texts = await generateQuestions(job);
    const questions = store.replaceQuestions(job.id, texts);
    res.json({ jobId: job.id, questions });
  } catch (error) {
    next(error);
  }
});

router.get("/candidates", (_req, res) => {
  res.json(store.listCandidates().map(candidateWithJob));
});

router.post("/candidates", (req, res) => {
  const { name, email, jobId } = req.body || {};
  if (!name || !email || !jobId) {
    return res.status(400).json({ error: "name, email, and jobId are required" });
  }
  if (!store.getJob(jobId)) {
    return res.status(400).json({ error: "jobId does not match an existing job" });
  }
  const candidate = store.createCandidate({ name, email, jobId });
  res.status(201).json(candidateWithJob(candidate));
});

router.get("/candidates/:id/questions", (req, res) => {
  const candidate = store.getCandidate(req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  const job = store.getJob(candidate.jobId);
  const answers = store.answersForCandidate(candidate.id);
  const questions = store.questionsForJob(candidate.jobId).map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    return {
      ...question,
      answer: answer
        ? { id: answer.id, text: answer.text }
        : null,
    };
  });
  res.json({ candidate: candidateWithJob(candidate), job, questions });
});

router.post("/candidates/:id/answers", (req, res) => {
  const candidate = store.getCandidate(req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  const { questionId, text } = req.body || {};
  if (!questionId || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "questionId and non-empty text are required" });
  }
  const question = store
    .questionsForJob(candidate.jobId)
    .find((item) => item.id === questionId);
  if (!question) {
    return res.status(400).json({ error: "questionId is not assigned to this candidate's job" });
  }
  const answer = store.upsertAnswer({
    candidateId: candidate.id,
    questionId,
    text: text.trim(),
  });
  res.status(201).json(answer);
});

router.post("/candidates/:id/evaluate", async (req, res, next) => {
  try {
    const candidate = store.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    const job = store.getJob(candidate.jobId);
    const submitted = store.answersForCandidate(candidate.id).filter((answer) => answer.text);
    if (!submitted.length) {
      return res.status(400).json({ error: "Candidate has no submitted answers to evaluate" });
    }
    const questionsById = new Map(
      store.questionsForJob(candidate.jobId).map((question) => [question.id, question])
    );
    const items = submitted.map((answer) => ({
      questionId: answer.questionId,
      question: questionsById.get(answer.questionId)?.text || "",
      answer: answer.text,
    }));
    const evaluations = await evaluateAnswers({ job, items });
    store.applyEvaluations(candidate.id, evaluations);
    res.json({ candidateId: candidate.id, results: buildResults(candidate) });
  } catch (error) {
    next(error);
  }
});

router.get("/candidates/:id/results", (req, res) => {
  const candidate = store.getCandidate(req.params.id);
  if (!candidate) return res.status(404).json({ error: "Candidate not found" });
  res.json({ candidate: candidateWithJob(candidate), results: buildResults(candidate) });
});

function buildResults(candidate) {
  const answers = store.answersForCandidate(candidate.id);
  const questionsById = new Map(
    store.questionsForJob(candidate.jobId).map((question) => [question.id, question])
  );
  return answers.map((answer) => ({
    ...answer,
    question: questionsById.get(answer.questionId)?.text || "",
  }));
}

export default router;
