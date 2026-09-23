const API_BASE = "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  listJobs: () => request("/api/jobs"),
  createJob: (body) =>
    request("/api/jobs", { method: "POST", body: JSON.stringify(body) }),
  generateQuestions: (jobId) =>
    request(`/api/jobs/${jobId}/generate-questions`, { method: "POST" }),
  listCandidates: () => request("/api/candidates"),
  createCandidate: (body) =>
    request("/api/candidates", { method: "POST", body: JSON.stringify(body) }),
  candidateQuestions: (id) => request(`/api/candidates/${id}/questions`),
  submitAnswer: (id, body) =>
    request(`/api/candidates/${id}/answers`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  evaluateCandidate: (id) =>
    request(`/api/candidates/${id}/evaluate`, { method: "POST" }),
  candidateResults: (id) => request(`/api/candidates/${id}/results`),
};
