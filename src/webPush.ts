import { existsSync, readFileSync } from "node:fs";
import webPush from "web-push";
import {
  getSubscriptions,
  removeSubscriptionByIndex,
} from "./pushSubscriptions";
import type { Notification } from "./types";

const VAPID_KEYS_PATH = "./secret/vapid-keys.json";

type VapidKeys = {
  publicKey: string;
  privateKey: string;
};

let vapidKeys: VapidKeys | null = null;
let initialized = false;

const loadVapidKeys = (): VapidKeys | null => {
  if (!existsSync(VAPID_KEYS_PATH)) {
    console.warn(
      `VAPID keys not found at ${VAPID_KEYS_PATH}. Run: bun run scripts/generate-vapid-keys.ts`
    );
    return null;
  }

  try {
    const data = readFileSync(VAPID_KEYS_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load VAPID keys:", error);
    return null;
  }
};

const initializeWebPush = (): boolean => {
  if (initialized) {
    return vapidKeys !== null;
  }

  vapidKeys = loadVapidKeys();
  if (vapidKeys) {
    webPush.setVapidDetails(
      "mailto:noreply@example.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    initialized = true;
    return true;
  }

  initialized = true;
  return false;
};

export const getVapidPublicKey = (): string | null => {
  initializeWebPush();
  return vapidKeys?.publicKey ?? null;
};

export const sendWebPushNotification = async (
  notification: Notification,
  extra?: Record<string, unknown>
): Promise<void> => {
  if (!initializeWebPush()) {
    console.warn("Web push not initialized, skipping notification");
    return;
  }

  const subscriptions = await getSubscriptions();
  if (subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    ...extra,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webPush.sendNotification(sub, payload))
  );

  // Remove expired/invalid subscriptions (in reverse order to preserve indices)
  const indicesToRemove: number[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const error = result.reason as { statusCode?: number };
      // 404 or 410 means the subscription is no longer valid
      if (error.statusCode === 404 || error.statusCode === 410) {
        indicesToRemove.push(index);
      } else {
        console.error(
          `Failed to send push to subscription ${index}:`,
          result.reason
        );
      }
    }
  });

  // Remove in reverse order to keep indices valid
  for (const index of indicesToRemove.reverse()) {
    await removeSubscriptionByIndex(index);
    console.log(`Removed expired subscription at index ${index}`);
  }
};
