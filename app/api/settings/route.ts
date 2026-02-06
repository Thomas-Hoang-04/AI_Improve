import { json } from "@/app/lib/api/validators";
import { getWipLimit, setWipLimit } from "@/app/lib/server/task-repo";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET() {
  return json({ wipLimit: getWipLimit() }, 200);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!isObject(body)) throw new Error("Body must be an object");
    const wipLimit = body.wipLimit;
    if (typeof wipLimit !== "number") throw new Error("wipLimit must be a number");
    setWipLimit(wipLimit);
    return json({ wipLimit: getWipLimit() }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 400);
  }
}


