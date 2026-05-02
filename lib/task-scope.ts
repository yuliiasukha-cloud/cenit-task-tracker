import type { Prisma } from "@/app/generated/prisma/client";

/** Tasks visible to the current principal: signed-in users see only their rows; guests see shared rows with no owner. */
export function taskScopeWhere(sessionUserId: string | undefined): Prisma.TaskWhereInput {
  if (sessionUserId) {
    return { userId: sessionUserId };
  }
  return { userId: null };
}

export function taskByIdScopeWhere(
  id: string,
  sessionUserId: string | undefined,
): Prisma.TaskWhereInput {
  return { id, ...taskScopeWhere(sessionUserId) };
}
