import { json } from "@/app/lib/api/validators";
import { getTask, overridePriority } from "@/app/lib/server/task-repo";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const task = getTask(id);
  if (!task) return json({ error: "Not found" }, 404);

  try {
    const body = await req.json();
    if (!isObject(body)) throw new Error("Body must be an object");
    if (typeof body.importance !== "boolean") throw new Error("importance must be boolean");
    if (typeof body.urgency !== "boolean") throw new Error("urgency must be boolean");

    const updated = overridePriority(id, { importance: body.importance, urgency: body.urgency });
    return json({ task: updated }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 400);
  }
}


