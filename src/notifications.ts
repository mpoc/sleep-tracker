import humanizeDuration from "humanize-duration";
import { env } from "./config";
import { ApiError } from "./error";
import type { Notification, SheetsSleepEntry } from "./types";
import { sheetsSleepEntryIsStop } from "./utils";

const sendNotification = async (notification: Notification) => {
  try {
    await fetch("https://api.pushbullet.com/v2/pushes", {
      method: "POST",
      headers: {
        "Access-Token": env.PUSHBULLET_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: notification.body,
        title: notification.title,
        type: "note",
      }),
    });
  } catch (error) {
    throw new ApiError("Failed to send notification", error);
  }
};

export const sendEntryNotification = async (entry: SheetsSleepEntry) => {
  const notification = getEntryNotificationText(entry);
  await sendNotification(notification);
};

export const sendDeleteNotification = async (entry: SheetsSleepEntry) => {
  const notification = getDeleteNotificationText(entry);
  await sendNotification(notification);
};

export const sendReminderNotification = async (
  msSinceLastSleepEntry: number,
  lastEntryIsStop: boolean
) => {
  const notification = getReminderNotificationText(
    msSinceLastSleepEntry,
    lastEntryIsStop
  );
  await sendNotification(notification);
};

const getEntryNotificationText = (entry: SheetsSleepEntry): Notification => {
  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(entry);
  return {
    title: lastSleepEntryIsStop
      ? "🌅 Sleep stop logged"
      : "🌃 Sleep start logged",
    body: getShortSleepEntryDescription(entry),
  };
};

const getDeleteNotificationText = (entry: SheetsSleepEntry): Notification => ({
  title: "🗑️ Sleep deleted",
  body: getShortSleepEntryDescription(entry),
});

const getReminderNotificationText = (
  msSinceLastSleepEntry: number,
  lastEntryIsStop: boolean
): Notification => {
  const time = humanizeDuration(msSinceLastSleepEntry, {
    units: ["h", "m"],
    round: true,
    delimiter: " and ",
  });
  return {
    title: lastEntryIsStop ? "🥱 Time to go to sleep" : "⏰ Time to wake up",
    body: `It has been ${time} since you ${lastEntryIsStop ? "woke up" : "fell asleep"}`,
  };
};

const getShortSleepEntryDescription = (entry: SheetsSleepEntry) => {
  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(entry);
  return lastSleepEntryIsStop
    ? `${entry["Timezone local time"]} at ${entry.Timezone}\nDuration: ${entry.Duration}`
    : `${entry["Timezone local time"]} at ${entry.Timezone}`;
};
