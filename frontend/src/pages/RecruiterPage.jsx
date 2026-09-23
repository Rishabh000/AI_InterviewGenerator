import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

export default function RecruiterPage() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [level, setLevel] = useState("mid-level");
  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [resultsByCandidate, setResultsByCandidate] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const jobCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.jobId === selectedJobId),
    [candidates, selectedJobId]
  );

  async function reload() {
    const [jobList, candidateList] = await Promise.all([
      api.listJobs(),
      api.listCandidates(),
    ]);
    setJobs(jobList);
    setCandidates(candidateList);
    setSelectedJobId((current) => current || jobList[0]?.id || null);
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message));
  }, []);

  async function onCreateJob(event) {
    event.preventDefault();
    setError("");
    setBusy("job");
    try {
      const job = await api.createJob({
        title,
        skills: skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        level,
      });
      setTitle("");
      setSkills("");
      await reload();
      setSelectedJobId(job.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function onGenerate() {
    if (!selectedJobId) return;
    setError("");
    setBusy("generate");
    try {
      await api.generateQuestions(selectedJobId);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function onAddCandidate(event) {
    event.preventDefault();
    if (!selectedJobId) return;
    setError("");
    setBusy("candidate");
    try {
      await api.createCandidate({
        name: candName,
        email: candEmail,
        jobId: selectedJobId,
      });
      setCandName("");
      setCandEmail("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function onEvaluate(candidateId) {
    setError("");
    setBusy(`eval-${candidateId}`);
    try {
      const payload = await api.evaluateCandidate(candidateId);
      setResultsByCandidate((current) => ({
        ...current,
        [candidateId]: payload.results,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function loadResults(candidateId) {
    setError("");
    try {
      const payload = await api.candidateResults(candidateId);
      setResultsByCandidate((current) => ({
        ...current,
        [candidateId]: payload.results,
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Recruiter workspace</p>
          <h1>Jobs, questions, and evaluations</h1>
        </div>
      </div>

      {error ? <div className="banner error">{error}</div> : null}

      <div className="grid-two">
        <article className="card">
          <h2>Create job listing</h2>
          <form onSubmit={onCreateJob} className="stack">
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ML Engineer"
                required
              />
            </label>
            <label>
              Skills (comma-separated)
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Python, SQL, Transformers"
                required
              />
            </label>
            <label>
              Level
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="junior">Junior</option>
                <option value="mid-level">Mid-level</option>
                <option value="senior">Senior</option>
              </select>
            </label>
            <button type="submit" disabled={busy === "job"}>
              {busy === "job" ? "Saving…" : "Add job"}
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Job listings</h2>
          <ul className="job-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className={job.id === selectedJobId ? "job-item active" : "job-item"}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <strong>{job.title}</strong>
                  <span>{job.level}</span>
                  <div className="chips">
                    {job.skills.map((skill) => (
                      <span key={skill} className="chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {selectedJob ? (
        <article className="card">
          <div className="card-head">
            <div>
              <h2>{selectedJob.title}</h2>
              <p>
                {selectedJob.level} · {selectedJob.skills.join(" · ")}
              </p>
            </div>
            <button type="button" onClick={onGenerate} disabled={busy === "generate"}>
              {busy === "generate" ? "Generating…" : "Generate 3–5 questions"}
            </button>
          </div>
          <ol className="questions">
            {(selectedJob.questions || []).length === 0 ? (
              <p className="muted">No questions yet. Generate a set with Gemini.</p>
            ) : (
              selectedJob.questions.map((question) => (
                <li key={question.id}>{question.text}</li>
              ))
            )}
          </ol>
        </article>
      ) : null}

      {selectedJob ? (
        <article className="card">
          <h2>Candidates for this job</h2>
          <form onSubmit={onAddCandidate} className="inline-form">
            <input
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
              placeholder="Name"
              required
            />
            <input
              type="email"
              value={candEmail}
              onChange={(e) => setCandEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <button type="submit" disabled={busy === "candidate"}>
              {busy === "candidate" ? "Adding…" : "Add candidate"}
            </button>
          </form>

          {jobCandidates.length === 0 ? (
            <p className="muted">No candidates assigned yet.</p>
          ) : (
            jobCandidates.map((candidate) => {
              const results = resultsByCandidate[candidate.id] || [];
              return (
                <div key={candidate.id} className="candidate-block">
                  <div className="card-head">
                    <div>
                      <strong>{candidate.name}</strong>
                      <p className="muted">{candidate.email}</p>
                    </div>
                    <div className="actions">
                      <button type="button" className="ghost" onClick={() => loadResults(candidate.id)}>
                        Load answers
                      </button>
                      <button
                        type="button"
                        onClick={() => onEvaluate(candidate.id)}
                        disabled={busy === `eval-${candidate.id}`}
                      >
                        {busy === `eval-${candidate.id}` ? "Evaluating…" : "Evaluate with Gemini"}
                      </button>
                    </div>
                  </div>
                  {results.length === 0 ? (
                    <p className="muted">Load answers or evaluate after the candidate submits.</p>
                  ) : (
                    <ul className="results">
                      {results.map((item) => (
                        <li key={item.id}>
                          <p className="question-text">{item.question}</p>
                          <p>{item.text}</p>
                          {item.score != null ? (
                            <div className="score-row">
                              <span className="score">Score {item.score}/5</span>
                              <span>{item.feedback}</span>
                            </div>
                          ) : (
                            <p className="muted">Not scored yet.</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </article>
      ) : null}
    </section>
  );
}
