# AI Interview Generator

Full-stack demo for generating domain-specific interview questions, collecting candidate answers, and scoring them with Google Gemini.

```
AI_InterviewGenerator/
  backend/     Express API (in-memory store + Gemini)
  frontend/    Vite + React (recruiter and candidate pages)
```

## Run locally

1. Backend

```bash
cd backend
cp .env.example .env
# Put your Gemini key in .env as GEMINI_API_KEY=...
npm install
npm start
```

API: `http://localhost:4000`

2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173`  
Vite proxies `/api` to the backend.

## LLM integration

Gemini is called from [`backend/src/gemini.js`](backend/src/gemini.js) via `@google/generative-ai`.

- **Question generation** (`POST /api/jobs/:id/generate-questions`): prompt includes job title, level, and skills; model returns JSON `{ "questions": [...] }` (3–5 items). Stored on the job.
- **Answer evaluation** (`POST /api/candidates/:id/evaluate`): few-shot examples plus internal chain-of-thought; model returns JSON `{ "evaluations": [{ "questionId", "score", "feedback" }] }`. Scores are integers 1–5.

Set `GEMINI_API_KEY` in `backend/.env`. Optional: `GEMINI_MODEL` (default `gemini-2.0-flash`) and `PORT` (default `4000`). Do not commit `.env`.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness |
| GET | `/api/jobs` | List jobs (with questions and candidates) |
| POST | `/api/jobs` | Create job `{ title, skills, level }` |
| GET | `/api/jobs/:id` | Job detail |
| POST | `/api/jobs/:id/generate-questions` | Gemini-generate 3–5 questions |
| GET | `/api/candidates` | List candidates |
| POST | `/api/candidates` | Add candidate `{ name, email, jobId }` |
| GET | `/api/candidates/:id/questions` | Assigned questions + saved answer text (no scores) |
| POST | `/api/candidates/:id/answers` | Submit/upsert `{ questionId, text }` |
| POST | `/api/candidates/:id/evaluate` | Gemini-score submitted answers |
| GET | `/api/candidates/:id/results` | Answers with score and feedback |

Data lives in memory ([`backend/src/store.js`](backend/src/store.js)). Restarting the API resets it. A seed Backend Engineer job, three sample questions, and candidate **Alex Rivera** are loaded at startup so the candidate flow works before you generate more questions with Gemini.

## Demo steps

### Recruiter

1. Open `http://localhost:5173/recruiter`. Header shows **Active role: Recruiter**.
2. Create a job (or use the seeded Backend Engineer listing).
3. Click **Generate 3–5 questions**.
4. Add a candidate name/email for that job.

### Candidate

1. Switch the header to **Candidate** (`/candidate`).
2. Select your identity.
3. Answer the assigned questions and submit.

### Recruiter evaluation

1. Switch back to Recruiter.
2. Select the job, **Load answers**, then **Evaluate with Gemini**.
3. Review 1–5 scores and feedback per answer.

Roles are a UI toggle only. Candidates never see scores; recruiters do.
