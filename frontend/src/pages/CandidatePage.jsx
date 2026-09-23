import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function CandidatePage() {
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [packet, setPacket] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listCandidates()
      .then((list) => {
        setCandidates(list);
        setSelectedId((current) => current || list[0]?.id || "");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPacket(null);
      return;
    }
    setError("");
    api
      .candidateQuestions(selectedId)
      .then((data) => {
        setPacket(data);
        const next = {};
        for (const question of data.questions) {
          next[question.id] = question.answer?.text || "";
        }
        setDrafts(next);
      })
      .catch((err) => setError(err.message));
  }, [selectedId]);

  async function submitOne(questionId) {
    const text = (drafts[questionId] || "").trim();
    if (!text) return;
    setBusy(questionId);
    setError("");
    setMessage("");
    try {
      await api.submitAnswer(selectedId, { questionId, text });
      setMessage("Answer saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function submitAll(event) {
    event.preventDefault();
    if (!packet) return;
    setBusy("all");
    setError("");
    setMessage("");
    try {
      const pending = packet.questions.filter((question) => drafts[question.id]?.trim());
      if (!pending.length) {
        throw new Error("Write at least one answer before submitting.");
      }
      for (const question of pending) {
        await api.submitAnswer(selectedId, {
          questionId: question.id,
          text: drafts[question.id].trim(),
        });
      }
      setMessage(`Submitted ${pending.length} answer(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Candidate workspace</p>
          <h1>Your assigned interview questions</h1>
        </div>
      </div>

      {error ? <div className="banner error">{error}</div> : null}
      {message ? <div className="banner ok">{message}</div> : null}

      <article className="card">
        <label>
          Who are you?
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {candidates.length === 0 ? <option value="">No candidates yet</option> : null}
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {candidate.job?.title || "Unassigned"}
              </option>
            ))}
          </select>
        </label>
      </article>

      {packet ? (
        <form onSubmit={submitAll} className="stack">
          <article className="card">
            <p className="muted">
              Role: {packet.job?.title} · {packet.job?.level}. Scores are visible only to the recruiter.
            </p>
          </article>

          {(packet.questions || []).length === 0 ? (
            <article className="card">
              <p className="muted">
                No questions have been generated for this job yet. Ask the recruiter to generate them.
              </p>
            </article>
          ) : (
            packet.questions.map((question, index) => (
              <article key={question.id} className="card">
                <h2>
                  Question {index + 1}
                </h2>
                <p>{question.text}</p>
                <label>
                  Your answer
                  <textarea
                    rows={5}
                    value={drafts[question.id] || ""}
                    onChange={(e) =>
                      setDrafts((current) => ({ ...current, [question.id]: e.target.value }))
                    }
                    placeholder="Write a concise technical answer…"
                  />
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => submitOne(question.id)}
                  disabled={busy === question.id}
                >
                  {busy === question.id ? "Saving…" : "Save this answer"}
                </button>
              </article>
            ))
          )}

          {(packet.questions || []).length > 0 ? (
            <button type="submit" disabled={busy === "all"}>
              {busy === "all" ? "Submitting…" : "Submit all answers"}
            </button>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
