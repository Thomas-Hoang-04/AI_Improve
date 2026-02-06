import { json, normalizeTaskStatus } from "@/app/lib/api/validators";
import { getTask, transition } from "@/app/lib/server/task-repo";

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
    const toStatus = normalizeTaskStatus(body.toStatus);
    if (!toStatus) throw new Error("toStatus invalid");

    const updated = transition(id, toStatus);
    return json({ task: updated }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // For invalid transitions/WIP, treat as conflict.
    return json({ error: message }, 409);
  }
}


