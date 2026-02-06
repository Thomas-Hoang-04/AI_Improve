import { json } from "@/app/lib/api/validators";
import { getTask, startTask } from "@/app/lib/server/task-repo";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const task = getTask(id);
  if (!task) return json({ error: "Not found" }, 404);

  try {
    const updated = startTask(id);
    return json({ task: updated }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 409);
  }
}


