export type MutationResult = { ok: true; href: string } | { ok: false; message: string };

export type ActionState = { ok: boolean; message: string };

export const idleState: ActionState = { ok: true, message: "" };
