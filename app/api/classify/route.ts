import type { CreateTaskInput } from "@/app/lib/types";
import { classifyTaskWithAI } from "@/app/lib/ai-service";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeCreateTaskInput(body: unknown): CreateTaskInput {
  if (!isObject(body)) throw new Error("Body must be an object");
  const title = body.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("title is required");
  }

  const description =
    typeof body.description === "string" ? body.description : undefined;
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : undefined;
  const effort =
    body.effort === "S" || body.effort === "M" || body.effort === "L"
      ? body.effort
      : undefined;
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string")
    : undefined;

  return {
    title: title.trim(),
    description,
    dueDate,
    effort,
    tags,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = normalizeCreateTaskInput(body);

    const classification = await classifyTaskWithAI(input);
    return new Response(JSON.stringify(classification), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}


