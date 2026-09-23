import { GoogleGenerativeAI } from "@google/generative-ai";

function requireClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    const error = new Error(
      "GEMINI_API_KEY is missing. Copy backend/.env.example to backend/.env and add your key."
    );
    error.status = 502;
    throw error;
  }
  return new GoogleGenerativeAI(apiKey);
}

function parseJson(raw) {
  const trimmed = String(raw || "").trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const start = unfenced.indexOf("[") >= 0 && (unfenced.indexOf("{") < 0 || unfenced.indexOf("[") < unfenced.indexOf("{"))
    ? unfenced.indexOf("[")
    : unfenced.indexOf("{");
  const end = Math.max(unfenced.lastIndexOf("]"), unfenced.lastIndexOf("}"));
  if (start < 0 || end < start) {
    throw new Error("Gemini returned a non-JSON response");
  }
  return JSON.parse(unfenced.slice(start, end + 1));
}

async function generateText(prompt) {
  const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const model = requireClient().getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateQuestions({ title, skills, level }) {
  const skillList = skills.join(", ");
  const prompt = `You are an expert technical interviewer.
Generate 5 ${title} interview questions for a ${level} engineer familiar with ${skillList}.

Requirements:
- Technical, domain-specific, and distinct
- Mix conceptual and practical questions
- No answers, no numbering prefixes
- Return JSON only: { "questions": ["question text", ...] }
- Array length must be between 3 and 5.`;

  try {
    const parsed = parseJson(await generateText(prompt));
    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list)) {
      throw new Error("Unexpected question format");
    }
    const questions = list
      .map((item) => (typeof item === "string" ? item : item.text || item.question))
      .map((text) => String(text || "").trim())
      .filter(Boolean)
      .slice(0, 5);
    if (questions.length < 3) {
      throw new Error("Gemini did not return enough questions");
    }
    return questions;
  } catch (error) {
    if (error.status) throw error;
    const wrapped = new Error(`Question generation failed: ${error.message}`);
    wrapped.status = 502;
    throw wrapped;
  }
}

export async function evaluateAnswers({ job, items }) {
  const prompt = `You are a senior interviewer scoring candidate answers.

Job: ${job.title} (${job.level})
Skills: ${job.skills.join(", ")}

Use internal chain-of-thought, but do not include reasoning in the output.

Few-shot examples:
Example 1:
Question: "What is an index in SQL?"
Answer: "A data structure that speeds up lookups, like a B-tree on a column."
Output: { "score": 4, "feedback": "Correct core idea; could mention write-cost tradeoffs." }

Example 2:
Question: "What is Docker?"
Answer: "It is a programming language."
Output: { "score": 1, "feedback": "Incorrect; Docker is a containerization platform, not a language." }

Score each answer from 1 to 5 (integer) for technical correctness and completeness.
Return JSON only:
{
  "evaluations": [
    { "questionId": "id from input", "score": 1, "feedback": "brief comment" }
  ]
}

Answers to evaluate:
${JSON.stringify(items, null, 2)}`;

  try {
    const parsed = parseJson(await generateText(prompt));
    const list = Array.isArray(parsed) ? parsed : parsed.evaluations;
    if (!Array.isArray(list)) {
      throw new Error("Unexpected evaluation format");
    }
    return list.map((item) => ({
      questionId: item.questionId,
      score: Math.min(5, Math.max(1, Number(item.score) || 1)),
      feedback: String(item.feedback || "").trim() || "No feedback provided.",
    }));
  } catch (error) {
    if (error.status) throw error;
    const wrapped = new Error(`Answer evaluation failed: ${error.message}`);
    wrapped.status = 502;
    throw wrapped;
  }
}
