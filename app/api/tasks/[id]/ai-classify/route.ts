import { json } from "@/app/lib/api/validators";
import { classifyTaskWithAI } from "@/app/lib/ai-service";
import { applyAIResult, getTask } from "@/app/lib/server/task-repo";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const task = getTask(id);
  if (!task) return json({ error: "Not found" }, 404);

  const ai = await classifyTaskWithAI({
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? undefined,
    effort: task.effort ?? undefined,
    tags: task.tags,
  });

  const updated = applyAIResult(id, ai);
  return json({ task: updated }, 200);
}


