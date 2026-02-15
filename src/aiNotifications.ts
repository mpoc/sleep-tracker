import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import ms from "ms";
import { z } from "zod";
import { env } from "./config";
import { getLastSleep, getRecentSleepEntries } from "./controller";
import { sendNotification } from "./notifications";
import type { Notification, SheetsSleepEntry } from "./types";
import { millisecondsSinceSleepEntry, sheetsSleepEntryIsStop } from "./utils";

const AI_CHECK_INTERVAL = env.AI_CHECK_INTERVAL;

const AiNotificationResponse = z.object({
  sendNotification: z
    .boolean()
    .describe("Whether to send a notification right now"),
  title: z
    .string()
    .optional()
    .describe("Short notification title (if sending)"),
  body: z
    .string()
    .optional()
    .describe("Notification body message (if sending)"),
});

interface SentNotification {
  title: string;
  body: string;
  sentAt: Date;
}

let sentNotificationsToday: SentNotification[] = [];
let lastResetDate: string | undefined;

const resetDailyNotificationsIfNeeded = () => {
  const today = new Date().toISOString().split("T")[0];
  if (lastResetDate !== today) {
    sentNotificationsToday = [];
    lastResetDate = today;
  }
};

const getModel = () => {
  if (!env.AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }
  const provider = createAnthropic({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL,
  });
  return provider(env.AI_MODEL);
};

const formatSleepHistory = (entries: SheetsSleepEntry[]): string => {
  return entries
    .map((entry) => {
      const type = entry.Duration ? "Woke up" : "Fell asleep";
      const duration = entry.Duration ? ` (slept ${entry.Duration})` : "";
      return `${type}: ${entry["Timezone local time"]}${duration}`;
    })
    .join("\n");
};

const parseUtcTime = (entry: SheetsSleepEntry): Date => {
  const [date, time] = entry["UTC time"].split(" ");
  return new Date(`${date}T${time}Z`);
};

const computeSleepStats = (entries: SheetsSleepEntry[]): string => {
  // Find pairs: fell asleep (no Duration) followed by woke up (has Duration)
  const sleepSessions: { start: Date; hours: number }[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].Duration || !entries[i + 1].Duration) continue;
    const startTime = parseUtcTime(entries[i]);
    const endTime = parseUtcTime(entries[i + 1]);
    const hours = (endTime.valueOf() - startTime.valueOf()) / (1000 * 60 * 60);
    if (hours > 0 && hours < 24) sleepSessions.push({ start: startTime, hours });
  }

  if (sleepSessions.length === 0) return "Not enough data to compute stats.";

  const durations = sleepSessions.map((s) => s.hours);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const shortest = Math.min(...durations);
  const longest = Math.max(...durations);
  const recentDebt = durations
    .slice(-5)
    .reduce((sum, h) => sum + Math.max(0, 8 - h), 0);

  const bedtimeHours = sleepSessions.map((s) => {
    const h = s.start.getUTCHours() + s.start.getUTCMinutes() / 60;
    // Shift past-midnight bedtimes (e.g. 1am -> 25) so averaging across midnight works
    return h < 12 ? h + 24 : h;
  });
  const avgBedtime = bedtimeHours.reduce((a, b) => a + b, 0) / bedtimeHours.length;
  const variance = bedtimeHours.reduce((sum, h) => sum + (h - avgBedtime) ** 2, 0) / bedtimeHours.length;
  const stddev = Math.sqrt(variance);
  const fmtHour = (h: number) => {
    const n = h >= 24 ? h - 24 : h;
    return `${Math.floor(n)}:${String(Math.round((n % 1) * 60)).padStart(2, "0")}`;
  };

  return [
    `Average sleep: ${avg.toFixed(1)}h`,
    `Range: ${shortest.toFixed(1)}h – ${longest.toFixed(1)}h`,
    `Recent sleep debt (last 5 nights, vs 8h target): ${recentDebt.toFixed(1)}h`,
    `Average bedtime (UTC): ${fmtHour(avgBedtime)} (±${(stddev * 60).toFixed(0)} min spread)`,
  ].join("\n");
};

const formatSentNotifications = (): string => {
  if (sentNotificationsToday.length === 0) {
    return "No notifications sent today yet.";
  }
  return sentNotificationsToday
    .map(
      (n) =>
        `[${n.sentAt.toISOString()}] "${n.title}": ${n.body}`
    )
    .join("\n");
};

const checkAiNotification = async () => {
  if (!env.AI_NOTIFICATIONS_ENABLED || !env.AI_API_KEY) {
    return;
  }

  try {
    const lastSleepData = await getLastSleep();
    const lastEntry = lastSleepData.lastSleepEntry;
    const isAwake = sheetsSleepEntryIsStop(lastEntry);

    resetDailyNotificationsIfNeeded();

    const recentEntries = await getRecentSleepEntries(20);
    const sleepHistory = formatSleepHistory(recentEntries);

    const msSinceLastEntry = millisecondsSinceSleepEntry(lastEntry);
    const hoursSinceLastEntry = (msSinceLastEntry / (1000 * 60 * 60)).toFixed(1);
    const currentState = isAwake
      ? `Awake for ${hoursSinceLastEntry} hours`
      : `Asleep for ${hoursSinceLastEntry} hours (or forgot to log waking up)`;

    const msSinceLastNotification =
      sentNotificationsToday.length > 0
        ? Date.now() -
          sentNotificationsToday[sentNotificationsToday.length - 1].sentAt.valueOf()
        : null;
    const timeSinceLastNotification = msSinceLastNotification
      ? `${(msSinceLastNotification / (1000 * 60)).toFixed(0)} minutes ago`
      : "No notifications sent today yet";

    const now = new Date();
    const userTimezone = lastEntry.Timezone;
    const localTime = now.toLocaleString("sv-SE", { timeZone: userTimezone }).replace("T", " ").slice(0, 16);

    const prompt = `You are a sleep health assistant that decides whether to send the user a notification right now. You are called roughly every 30 minutes.

## Current state
- Current time: ${localTime} (${userTimezone}, ${now.toLocaleDateString("en-US", { timeZone: userTimezone, weekday: "long" })})
- User status: ${currentState}
- Last notification sent: ${timeSinceLastNotification}
- Notifications sent today: ${sentNotificationsToday.length}

## Notifications sent today
${formatSentNotifications()}

## Sleep stats
${computeSleepStats(recentEntries)}

## Recent sleep history (last ~10 days, most recent last)
${sleepHistory}

## Your guidelines
- Send 1-3 notifications per day total. Don't overdo it.
- Types of notifications you can send:
  - Bedtime nudge: when it's getting close to or past their usual bedtime, gently remind them. Adapt based on their recent pattern.
  - Sleep pattern observation: if you notice something interesting (building sleep debt, inconsistent schedule, a good streak), share it. These work well in the afternoon.
  - Recovery suggestion: if they've had short nights recently, suggest prioritizing sleep tonight.
  - Morning recap: shortly after the user wakes up (2+ hours awake), summarize last night's sleep (duration, how it compares to their average). Good for once a day.
  - Forgotten log reminder: if the user appears to be "asleep" for an unusually long time (e.g. much longer than their typical sleep duration), they may have forgotten to log waking up. Gently remind them.
- Don't repeat the same insight you already sent today (check the notifications sent today list).
- Don't send notifications too close together — at least 2 hours apart.
- Don't send notifications between 2am and 8am local time.
- Don't send notifications if the user just woke up (less than 2 hours awake).
- Keep titles short (3-5 words) and bodies to 1-2 sentences — push notifications truncate. Feel free to use emojis to make notifications more expressive.
- If there's nothing useful to say right now, don't send anything. It's fine to skip.

Decide: should you send a notification right now? If yes, provide the title and body.`;

    console.log(`${now.toISOString()}: AI notification check\nPrompt:\n${prompt}`);

    const { object: result } = await generateObject({
      model: getModel(),
      maxTokens: 300,
      schema: AiNotificationResponse,
      prompt,
    });

    console.log(
      `${now.toISOString()}: AI response: ${JSON.stringify(result)}`
    );

    if (result.sendNotification && result.title && result.body) {
      const notification: Notification = {
        title: result.title,
        body: result.body,
      };

      await sendNotification(notification);

      sentNotificationsToday.push({
        title: result.title,
        body: result.body,
        sentAt: now,
      });
    }
  } catch (error) {
    console.error("AI notification check failed:", error);
  }
};

export const aiNotificationLoop = () => {
  if (!env.AI_NOTIFICATIONS_ENABLED) {
    return;
  }

  console.log(`Starting AI notification loop (interval: ${AI_CHECK_INTERVAL})`);
  checkAiNotification();
  setTimeout(aiNotificationLoop, ms(AI_CHECK_INTERVAL));
};
