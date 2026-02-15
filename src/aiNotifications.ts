import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import ms from "ms";
import { z } from "zod";
import { env } from "./config";
import { getLastSleep, getRecentSleepEntries } from "./controller";
import { sendNotification } from "./notifications";
import type { Notification, SheetsSleepEntry, SentNotification } from "./types";
import { jsonToSentNotifications } from "./types";
import { circularStatsHours, millisecondsSinceSleepEntry, sheetsSleepEntryIsStop } from "./utils";

const AI_CHECK_INTERVAL = env.AI_CHECK_INTERVAL;
const NOTIFICATIONS_PATH = "./data/sent-notifications.json";

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

const loadRecentNotifications = async (): Promise<SentNotification[]> => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  try {
    const data = await Bun.file(NOTIFICATIONS_PATH).text();
    const all = jsonToSentNotifications.decode(data);
    return all.filter((n) => n.sentAt.valueOf() >= cutoff);
  } catch {
    return [];
  }
};

const appendNotification = async (n: SentNotification): Promise<void> => {
  let all: SentNotification[] = [];
  try {
    const data = await Bun.file(NOTIFICATIONS_PATH).text();
    all = jsonToSentNotifications.decode(data);
  } catch {
    // file doesn't exist yet
  }
  all.push(n);
  await Bun.write(NOTIFICATIONS_PATH, jsonToSentNotifications.encode(all));
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
      return `${type}: ${entry["Timezone local time"]} (${entry.Timezone})${duration}`;
    })
    .join("\n");
};

const parseUtcTime = (entry: SheetsSleepEntry): Date => {
  const [date, time] = entry["UTC time"].split(" ");
  return new Date(`${date}T${time}Z`);
};

const computeSleepStats = (entries: SheetsSleepEntry[]): string => {
  // Find pairs: fell asleep (no Duration) followed by woke up (has Duration)
  const sleepSessions: { localTime: string; hours: number }[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].Duration || !entries[i + 1].Duration) continue;
    const startTime = parseUtcTime(entries[i]);
    const endTime = parseUtcTime(entries[i + 1]);
    const hours = (endTime.valueOf() - startTime.valueOf()) / (1000 * 60 * 60);
    if (hours > 0 && hours < 24) sleepSessions.push({ localTime: entries[i]["Timezone local time"], hours });
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
    const d = new Date(s.localTime);
    return d.getHours() + d.getMinutes() / 60;
  });
  const { meanHours, stdHours } = circularStatsHours(bedtimeHours);
  const fmtHour = (h: number) => {
    const totalMinutes = Math.round(h * 60);
    const hrs = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hrs}:${String(mins).padStart(2, "0")}`;
  };

  return [
    `Average sleep: ${avg.toFixed(1)}h`,
    `Range: ${shortest.toFixed(1)}h – ${longest.toFixed(1)}h`,
    `Recent sleep debt (last 5 nights, vs 8h target): ${recentDebt.toFixed(1)}h`,
    `Average bedtime (local time): ${fmtHour(meanHours)} (±${(stdHours * 60).toFixed(0)} min spread)`,
  ].join("\n");
};

const formatSentNotifications = (recent: SentNotification[]): string => {
  if (recent.length === 0) {
    return "No recent notifications.";
  }
  return recent
    .map((n) => `[${n.sentAt.toISOString()}] "${n.title}": ${n.body}`)
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

    const recentNotifications = await loadRecentNotifications();

    const recentEntries = await getRecentSleepEntries(20);
    const sleepHistory = formatSleepHistory(recentEntries);

    const msSinceLastEntry = millisecondsSinceSleepEntry(lastEntry);
    const hoursSinceLastEntry = (msSinceLastEntry / (1000 * 60 * 60)).toFixed(1);
    const currentState = isAwake
      ? `Awake for ${hoursSinceLastEntry} hours`
      : `Asleep for ${hoursSinceLastEntry} hours`;

    const lastNotification = recentNotifications.at(-1);
    const msSinceLastNotification = lastNotification
      ? Date.now() - lastNotification.sentAt.valueOf()
      : null;
    const timeSinceLastNotification = msSinceLastNotification
      ? `${(msSinceLastNotification / (1000 * 60)).toFixed(0)} minutes ago`
      : "No recent notifications";

    const now = new Date();
    const userTimezone = lastEntry.Timezone;
    const localTime = now.toLocaleString("sv-SE", { timeZone: userTimezone }).replace("T", " ").slice(0, 16);

    const prompt = `You are a sleep health assistant that decides whether to send the user a push notification. You are called every ~30 minutes. Most of the time, you should NOT send a notification. Silence is the default — only send when you have a genuinely useful, well-timed reason.

## Hard rules (never violate these)
1. NEVER send between 2am and 8am local time. The user is sleeping. Do not wake them.
2. NEVER send if the last notification was less than 2 hours ago.
3. NEVER send more than 3 notifications in one day. If 3 have been sent, always return sendNotification: false.
4. NEVER send the same type of notification twice in one day (e.g. two "forgotten log" reminders, or two bedtime nudges).
5. NEVER send a "forgotten log" reminder if the user has been asleep for less than 10 hours. Normal sleep is 6-9 hours — that's not "unusually long."

If ANY of the above apply, you MUST return sendNotification: false. Do not reason around them.

## Current state
- Current time: ${localTime} (${userTimezone}, ${now.toLocaleDateString("en-US", { timeZone: userTimezone, weekday: "long" })})
- User status: ${currentState}
- Last notification sent: ${timeSinceLastNotification}
- Notifications in last 24h: ${recentNotifications.length}

## Notifications already sent in last 24 hours
${formatSentNotifications(recentNotifications)}

## Sleep stats
${computeSleepStats(recentEntries)}

## Recent sleep history (last ~10 days, most recent last)
${sleepHistory}

## Notification types (pick at most one)
- **Bedtime nudge**: Near or past their usual bedtime and they're still awake. One per night max. Use your judgment — if it seems like they're intentionally staying up late (weekend, not been awake that long), maybe skip it.
- **Sleep pattern observation**: Something interesting in the data (sleep debt, inconsistent schedule, good streak). Best in the afternoon.
- **Recovery suggestion**: Short nights recently — suggest prioritizing sleep tonight.
- **Morning recap**: After the user has been awake for 2+ hours, summarize last night's sleep. Once per day.
- **Forgotten log reminder**: User has been "asleep" for an *unusually* long time (10+ hours, well beyond their average). They probably forgot to log waking up. Once per sleep session max.
- **Consistency streak**: The user has maintained a regular bedtime or solid sleep duration for several nights. Celebrate it — "4 nights of 7+ hours, nice run." Positive reinforcement helps more than nagging.
- **Circadian shift detection**: Their bedtime has been gradually drifting earlier or later over the past week. Flag it gently — most people don't notice gradual drift.
- **Nap window**: It's a weekend (Saturday or Sunday), it's afternoon, they've been awake 8+ hours, and they have recent sleep debt. Suggest a short nap before 3pm. Never send this on weekdays.
- **Evening preview**: Based on recent patterns, tell them roughly when they'll probably want to be in bed tonight. Forward-looking, not judgmental.
- **Timezone recovery**: If the timezone in recent entries changed (travel), comment on how their sleep rhythm is adjusting to the new zone.
- **Good night acknowledgment**: After a particularly good night's sleep (long, well-timed, improving a debt), just say something nice. No advice, no action items — just "that was a solid night."

## Tone
- Lean positive. Celebrate good nights and streaks more than you criticize bad ones.
- A bad night is not a crisis. Don't catastrophize or lecture. People already feel bad about poor sleep — piling on makes it worse and can fuel anxiety that makes sleep harder.
- If sleep has been rough recently, be encouraging rather than clinical. "Tomorrow's a fresh start" beats "you have 4.2 hours of sleep debt."
- Keep titles to 3-5 words, bodies to 1-2 short sentences. Emojis welcome.
- Don't nag. Don't be repetitive. Check what you already sent today before deciding.

## Decision
Review the hard rules first. If any apply, return sendNotification: false immediately. Otherwise, decide if there's something genuinely worth notifying about right now. If the user is asleep and the duration is within a normal range for them, there is nothing to do — just return false. When in doubt, don't send.`;

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

      await appendNotification({
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
