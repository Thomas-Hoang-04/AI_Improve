import { json, normalizePatchMeta } from "@/app/lib/api/validators";
import { getTask, patchTaskMeta } from "@/app/lib/server/task-repo";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const task = getTask(id);
  if (!task) return json({ error: "Not found" }, 404);
  return json({ task }, 200);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const patch = normalizePatchMeta(body);
    const updated = patchTaskMeta(id, patch as any);
    return json({ task: updated }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, message === "Task not found" ? 404 : 400);
  }
}


