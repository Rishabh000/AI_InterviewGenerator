function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const jobs = [
  {
    id: "job_seed_backend",
    title: "Backend Engineer",
    skills: ["Python", "SQL", "Docker"],
    level: "mid-level",
  },
];

const questions = [
  {
    id: "q_seed_1",
    jobId: "job_seed_backend",
    text: "How would you design a REST API for a job-application service, and which status codes would you use for create vs. conflict?",
  },
  {
    id: "q_seed_2",
    jobId: "job_seed_backend",
    text: "Explain how you would use SQL indexes and query plans to speed up a candidate search by skill and location.",
  },
  {
    id: "q_seed_3",
    jobId: "job_seed_backend",
    text: "Describe a Docker-based local development setup for a Node.js API and a React client, including networking between containers.",
  },
];

const candidates = [
  {
    id: "cand_seed_alex",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    jobId: "job_seed_backend",
  },
];

const answers = [];

export const store = {
  createId,
  jobs,
  questions,
  candidates,
  answers,

  listJobs() {
    return jobs;
  },

  getJob(id) {
    return jobs.find((job) => job.id === id) ?? null;
  },

  createJob({ title, skills, level }) {
    const job = {
      id: createId("job"),
      title: title.trim(),
      skills: skills.map((skill) => skill.trim()).filter(Boolean),
      level: (level || "mid-level").trim(),
    };
    jobs.push(job);
    return job;
  },

  questionsForJob(jobId) {
    return questions.filter((question) => question.jobId === jobId);
  },

  replaceQuestions(jobId, texts) {
    for (let i = questions.length - 1; i >= 0; i -= 1) {
      if (questions[i].jobId === jobId) {
        questions.splice(i, 1);
      }
    }
    const created = texts.map((text) => ({
      id: createId("q"),
      jobId,
      text,
    }));
    questions.push(...created);
    return created;
  },

  listCandidates() {
    return candidates;
  },

  getCandidate(id) {
    return candidates.find((candidate) => candidate.id === id) ?? null;
  },

  createCandidate({ name, email, jobId }) {
    const candidate = {
      id: createId("cand"),
      name: name.trim(),
      email: email.trim(),
      jobId,
    };
    candidates.push(candidate);
    return candidate;
  },

  answersForCandidate(candidateId) {
    return answers.filter((answer) => answer.candidateId === candidateId);
  },

  upsertAnswer({ candidateId, questionId, text }) {
    const existing = answers.find(
      (answer) =>
        answer.candidateId === candidateId && answer.questionId === questionId
    );
    if (existing) {
      existing.text = text;
      existing.score = null;
      existing.feedback = null;
      return existing;
    }
    const answer = {
      id: createId("ans"),
      candidateId,
      questionId,
      text,
      score: null,
      feedback: null,
    };
    answers.push(answer);
    return answer;
  },

  applyEvaluations(candidateId, evaluations) {
    const byQuestion = new Map(
      evaluations.map((item) => [item.questionId, item])
    );
    const updated = [];
    for (const answer of answers) {
      if (answer.candidateId !== candidateId) continue;
      const evaluation = byQuestion.get(answer.questionId);
      if (!evaluation) continue;
      answer.score = evaluation.score;
      answer.feedback = evaluation.feedback;
      updated.push(answer);
    }
    return updated;
  },
};
