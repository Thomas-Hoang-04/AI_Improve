import { json, normalizeCreateTaskInput } from "@/app/lib/api/validators";
import { createTask, listTasks } from "@/app/lib/server/task-repo";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const notStatus = url.searchParams.get("notStatus") ?? undefined;

  const tasks = listTasks({
    status: status as any,
    notStatus: notStatus as any,
  });
  return json({ tasks }, 200);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = normalizeCreateTaskInput(body);
    const task = await createTask(input);
    return json({ task }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 400);
  }
}


