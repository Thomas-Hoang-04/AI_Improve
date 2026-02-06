import type { Task, TaskStatus } from "./types";

export const DEFAULT_WIP_LIMIT = 3;

export type TransitionResult =
  | { ok: true; task: Task }
  | { ok: false; error: string; code: "INVALID_TRANSITION" | "WIP_LIMIT_EXCEEDED" };

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  switch (from) {
    case "BACKLOG":
      return to === "TODO";
    case "TODO":
      return to === "IN_PROGRESS";
    case "IN_PROGRESS":
      return to === "REVIEW";
    case "REVIEW":
      return to === "DONE";
    case "DONE":
      return false;
    default:
      return false;
  }
}

export function applyAutoPromotion(task: Task): Task {
  // Transparent rule: Important + Urgent tasks leave decision layer (BACKLOG) into TODO.
  if (task.status === "BACKLOG" && task.importance && task.urgency) {
    return { ...task, status: "TODO" };
  }
  return task;
}

export function transitionTask(
  task: Task,
  to: TaskStatus,
  ctx: {
    /**
     * Current count of tasks in IN_PROGRESS (excluding this task if it's already IN_PROGRESS).
     */
    currentInProgressCount: number;
    wipLimit?: number;
  },
): TransitionResult {
  if (!canTransition(task.status, to)) {
    return { ok: false, code: "INVALID_TRANSITION", error: `${task.status} → ${to} is not allowed` };
  }

  if (to === "IN_PROGRESS") {
    const limit = ctx.wipLimit ?? DEFAULT_WIP_LIMIT;
    if (ctx.currentInProgressCount >= limit) {
      return {
        ok: false,
        code: "WIP_LIMIT_EXCEEDED",
        error: `WIP limit exceeded (${ctx.currentInProgressCount}/${limit})`,
      };
    }
  }

  const now = new Date().toISOString();
  const updated: Task = { ...task, status: to, updatedAt: now };
  return { ok: true, task: updated };
}


