import { db } from "./db";
import type { CaptureDraft } from "./types";

const KEY = "capture";

export async function loadCaptureDraft(): Promise<CaptureDraft | undefined> {
  return db.drafts.get(KEY);
}

export async function saveCaptureDraft(draft: Omit<CaptureDraft, "id" | "savedAt">): Promise<void> {
  await db.drafts.put({ ...draft, id: KEY, savedAt: Date.now() });
}

export async function clearCaptureDraft(): Promise<void> {
  await db.drafts.delete(KEY);
}
