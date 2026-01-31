import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { jsonToPushSubscriptions, type PushSubscription } from "./types";

const DATA_DIR = "./data";
const SUBSCRIPTIONS_PATH = `${DATA_DIR}/push-subscriptions.json`;
const MAX_SUBSCRIPTIONS = 10;

let subscriptions: PushSubscription[] | null = null;

const ensureDataDir = async () => {
  await mkdir(dirname(SUBSCRIPTIONS_PATH), { recursive: true });
};

const loadSubscriptions = async (): Promise<PushSubscription[]> => {
  if (subscriptions !== null) {
    return subscriptions;
  }

  if (!existsSync(SUBSCRIPTIONS_PATH)) {
    subscriptions = [];
    return subscriptions;
  }

  try {
    const data = await readFile(SUBSCRIPTIONS_PATH, "utf-8");
    subscriptions = jsonToPushSubscriptions.decode(data);
    return subscriptions;
  } catch {
    subscriptions = [];
    return subscriptions;
  }
};

const saveSubscriptions = async (subs: PushSubscription[]): Promise<void> => {
  await ensureDataDir();
  await writeFile(SUBSCRIPTIONS_PATH, JSON.stringify(subs, null, 2));
  subscriptions = subs;
};

export const getSubscriptions = async (): Promise<PushSubscription[]> => {
  return loadSubscriptions();
};

export const addSubscription = async (
  subscription: PushSubscription
): Promise<void> => {
  const subs = await loadSubscriptions();

  // Avoid duplicates based on endpoint
  const existingIndex = subs.findIndex(
    (s) => s.endpoint === subscription.endpoint
  );
  if (existingIndex >= 0) {
    subs[existingIndex] = subscription;
  } else {
    subs.push(subscription);
  }

  // Remove oldest if over limit
  while (subs.length > MAX_SUBSCRIPTIONS) {
    subs.shift();
  }

  await saveSubscriptions(subs);
};

export const removeSubscription = async (endpoint: string): Promise<void> => {
  const subs = await loadSubscriptions();
  const filtered = subs.filter((s) => s.endpoint !== endpoint);
  await saveSubscriptions(filtered);
};

export const removeSubscriptionByIndex = async (
  index: number
): Promise<void> => {
  const subs = await loadSubscriptions();
  subs.splice(index, 1);
  await saveSubscriptions(subs);
};
