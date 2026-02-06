import { GoogleGenerativeAI } from "@google/genai";
import type { AIClassification, CreateTaskInput, Effort } from "./types";

type AIServiceOptions = {
  /**
   * Optional override for the API key. Prefer using process.env.GEMINI_API_KEY.
   * We intentionally do NOT hardcode secrets in source code.
   */
  apiKey?: string;
  /**
   * Defaults to a Gemini model that supports text generation.
   */
  model?: string;
};

function effortToHours(effort?: Effort): number | null {
  if (!effort) return null;
  switch (effort) {
    case "S":
      return 1;
    case "M":
      return 4;
    case "L":
      return 10;
    default:
      return null;
  }
}

function daysUntil(dueDate?: string): number | null {
  if (!dueDate) return null;
  const dt = new Date(dueDate);
  if (Number.isNaN(dt.getTime())) return null;
  const now = new Date();
  const diffMs = dt.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function heuristicClassify(input: CreateTaskInput): AIClassification {
  const title = (input.title ?? "").toLowerCase();
  const desc = (input.description ?? "").toLowerCase();
  const text = `${title} ${desc}`;

  const d = daysUntil(input.dueDate);
  const hrs = effortToHours(input.effort);

  const urgencySignals = [
    "asap",
    "urgent",
    "today",
    "tonight",
    "tomorrow",
    "deadline",
    "overdue",
    "pay",
    "bill",
    "tax",
    "incident",
    "outage",
    "production",
  ];

  const importanceSignals = [
    "strategy",
    "plan",
    "planning",
    "roadmap",
    "career",
    "health",
    "fitness",
    "doctor",
    "family",
    "security",
    "backup",
    "compliance",
    "quarter",
    "okr",
    "goal",
    "budget",
  ];

  const urgencyByText = urgencySignals.some((k) => text.includes(k));
  const importanceByText = importanceSignals.some((k) => text.includes(k));

  const urgencyByDue =
    d !== null ? (d <= 2 ? true : d <= 7 ? urgencyByText || false : false) : false;

  // If it's large effort but near due date, treat as urgent (needs starting now).
  const urgencyByEffort =
    d !== null && hrs !== null ? (d <= 3 && hrs >= 4 ? true : false) : false;

  const urgency = Boolean(urgencyByText || urgencyByDue || urgencyByEffort);
  const importance = Boolean(importanceByText || (hrs !== null && hrs >= 4));

  const explanationParts: string[] = [];
  if (d !== null) explanationParts.push(`Due in ${d} day(s)`);
  if (hrs !== null) explanationParts.push(`Effort ~${hrs}h`);
  if (urgencyByText) explanationParts.push("Contains urgency keywords");
  if (importanceByText) explanationParts.push("Contains importance keywords");

  const explanation =
    explanationParts.length > 0
      ? `${urgency ? "Urgent" : "Not urgent"} / ${importance ? "Important" : "Not important"} — ${explanationParts.join(
          "; ",
        )}`
      : `${urgency ? "Urgent" : "Not urgent"} / ${importance ? "Important" : "Not important"} — Heuristic classification`;

  return { importance, urgency, explanation };
}

function buildSystemPrompt() {
  return [
    "You are a task prioritization assistant using the Eisenhower Matrix.",
    "Classify tasks into two booleans: importance and urgency.",
    "",
    "Definitions:",
    "- Urgent: time-sensitive, near deadline, blocking others, or has immediate consequences.",
    "- Important: high impact on goals, health, security, key relationships, or long-term outcomes.",
    "",
    "Return ONLY strict JSON with keys:",
    '{ "importance": boolean, "urgency": boolean, "explanation": string }',
    "",
    "The explanation must be short (<= 200 chars) and concrete.",
  ].join("\n");
}

function safeParseClassification(text: string): AIClassification | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
  const candidate = trimmed.slice(jsonStart, jsonEnd + 1);
  try {
    const obj = JSON.parse(candidate) as Partial<AIClassification>;
    if (typeof obj.importance !== "boolean") return null;
    if (typeof obj.urgency !== "boolean") return null;
    if (typeof obj.explanation !== "string") return null;
    return {
      importance: obj.importance,
      urgency: obj.urgency,
      explanation: obj.explanation.slice(0, 300),
    };
  } catch {
    return null;
  }
}

export async function classifyTaskWithAI(
  input: CreateTaskInput,
  opts: AIServiceOptions = {},
): Promise<AIClassification> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) return heuristicClassify(input);

  const model = opts.model ?? "gemini-2.0-flash";
  const client = new GoogleGenerativeAI({ apiKey });

  const prompt = [
    buildSystemPrompt(),
    "",
    "Task:",
    JSON.stringify(
      {
        title: input.title,
        description: input.description ?? "",
        dueDate: input.dueDate ?? null,
        effort: input.effort ?? null,
        tags: input.tags ?? [],
      },
      null,
      2,
    ),
  ].join("\n");

  try {
    const resp = await client.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = resp.text ?? "";
    const parsed = safeParseClassification(text);
    return parsed ?? heuristicClassify(input);
  } catch {
    return heuristicClassify(input);
  }
}


