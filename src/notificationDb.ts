import { Low } from "lowdb";
import { JSONLFile } from "lowdb-jsonl-adapter";
import { DATA_DIR } from "./ensureDataDir";
import { SentNotification } from "./types";

const NOTIFICATIONS_PATH = `${DATA_DIR}/sent-notifications.jsonl`;

const adapter = new JSONLFile<SentNotification>(NOTIFICATIONS_PATH);
const db = new Low(adapter, []);

const parseAll = (): SentNotification[] =>
  SentNotification.array().parse(db.data);

export const getRecentNotifications = async (
  cutoffMs: number
): Promise<SentNotification[]> => {
  await db.read();
  const cutoff = Date.now() - cutoffMs;
  return parseAll().filter((n) => n.sentAt.valueOf() >= cutoff);
};

export const appendNotification = async (
  notification: SentNotification
): Promise<void> => {
  await db.read();
  db.data.push(notification);
  await db.write();
};

export const findNotificationById = async (
  id: string
): Promise<SentNotification | undefined> => {
  await db.read();
  return parseAll().find((n) => n.id === id);
};

export const updateNotification = async (
  id: string,
  updates: Partial<Pick<SentNotification, "feedback" | "feedbackGivenAt">>
): Promise<void> => {
  await db.read();
  const raw = db.data.find((n) => n.id === id);
  if (raw) {
    Object.assign(raw, updates);
    await db.write();
  }
};
