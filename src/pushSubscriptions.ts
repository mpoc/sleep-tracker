import { JSONFilePreset } from "lowdb/node";
import { DATA_DIR } from "./ensureDataDir";
import type { PushSubscription } from "./types";

const SUBSCRIPTIONS_PATH = `${DATA_DIR}/push-subscriptions.json`;
const MAX_SUBSCRIPTIONS = 10;

const db = await JSONFilePreset<PushSubscription[]>(SUBSCRIPTIONS_PATH, []);

export const getSubscriptions = async (): Promise<PushSubscription[]> => {
  await db.read();
  return db.data;
};

export const addSubscription = async (
  subscription: PushSubscription
): Promise<void> => {
  await db.read();

  const existingIndex = db.data.findIndex(
    (s) => s.endpoint === subscription.endpoint
  );
  if (existingIndex === -1) {
    db.data.push(subscription);
  } else {
    db.data[existingIndex] = subscription;
  }

  while (db.data.length > MAX_SUBSCRIPTIONS) {
    db.data.shift();
  }

  await db.write();
};

export const removeSubscription = async (endpoint: string): Promise<void> => {
  await db.read();
  db.data = db.data.filter((s) => s.endpoint !== endpoint);
  await db.write();
};

export const removeSubscriptionByIndex = async (
  index: number
): Promise<void> => {
  await db.read();
  db.data.splice(index, 1);
  await db.write();
};
