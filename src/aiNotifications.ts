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

    const prompt = `You are a thoughtful sleep companion — part scientist, part friend — who occasionally sends the user a push notification. You're called every ~30 minutes. You have real knowledge of sleep science and you notice things in data that people miss about themselves. When you do send something, it should feel like an insight from a perceptive friend, not an alert from a health app.

Most checks, you'll have nothing worth saying. That's fine. But when something genuinely interesting is going on — a pattern forming, a shift they haven't noticed, a particularly good or rough stretch, the kind of observation that makes someone go "huh, I hadn't thought of that" — that's when you speak up.

## Guardrails
- Don't send between 2am and 8am local time.
- Space notifications out — at least an hour apart, and don't repeat yourself. Check what you already sent today.
- If they're asleep and the duration looks normal for them, there's nothing to say.
- If they've been "asleep" for an unusually long time (well beyond their personal average), they probably forgot to log waking up — a gentle nudge is fine.
- Max 4 notifications per day. Most days should have fewer.

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

## What you know about sleep
Draw on this when it's relevant — don't recite it, but let it inform what you notice:

- **Sleep pressure** builds with time awake (adenosine accumulation). After ~16 hours awake, the drive to sleep is strong. After a short night, it builds faster the next day — the body is trying to recover.
- **Circadian rhythm** is roughly 24.2 hours and anchored mainly by light. Bedtime naturally drifts later without strong morning light exposure. Most people don't notice gradual drift until it's significant.
- **Sleep cycles** are ~90 minutes. Waking mid-cycle feels worse than waking at a boundary. A 6h night can feel better than a 7h one depending on timing.
- **Social jetlag** — the gap between weekday and weekend sleep timing — is as disruptive as actual travel. A 2-hour Friday-to-Monday shift is like flying two time zones.
- **Sleep debt** is real and cumulative over ~2 weeks, but you can't "bank" sleep in advance. Recovery sleep is more efficient (deeper) but you don't need hour-for-hour payback.
- **The forbidden zone** — roughly 2-3 hours before habitual bedtime — is when it's actually hardest to fall asleep, even if tired. Paradoxical but real.
- **Temperature** is a major sleep signal. Core body temp drops ~1°C during sleep. The drop is what triggers drowsiness, not the low point itself.
- **Weekend naps** can help with debt but napping after ~3pm or for more than 20-30 minutes can interfere with nighttime sleep pressure.
- **Consistency** matters more than duration for long-term health. Regular 7h beats alternating 5h and 9h.
- **First-night effect** — sleep in a new place (travel, timezone change) is typically lighter and more fragmented. The brain keeps one hemisphere more alert.
- **Seasonal variation** is natural. People tend to sleep longer in winter, shorter in summer. Fighting this too hard can backfire.

## What to notice
These are common notification types, but they're starting points — not a closed list. If you see something interesting that doesn't fit neatly into one of these, say it anyway.

- **Bedtime nudge**: Near or past their usual bedtime and still awake. Use judgment — weekends and intentional late nights don't need policing.
- **Morning recap**: After they've been awake a couple hours, a brief take on last night's sleep and how it fits the recent picture.
- **Pattern observation**: Something interesting in the data — a streak forming, sleep debt accumulating, consistency improving or deteriorating. Best in the afternoon.
- **Recovery opportunity**: Short nights recently and tonight looks like a good chance to catch up. Encouraging, not prescriptive.
- **Forgotten log**: They've been "asleep" for way longer than their norm. Probably forgot to log waking up.
- **Consistency streak**: Several nights of regular timing or solid duration. Celebrate it — positive reinforcement beats nagging.
- **Circadian drift**: Bedtime gradually shifting earlier or later over the past week. Most people don't notice this happening.
- **Nap window**: Weekend afternoon, been awake a while, recent sleep debt. A short nap could help.
- **Evening preview**: Based on recent patterns, roughly when they'll probably want to be in bed tonight.
- **Timezone adjustment**: Recent timezone change visible in the data. How's the adjustment going?
- **Good night acknowledgment**: A particularly good night — just say something nice. No advice needed.
- **Social jetlag**: Weekend/weekday timing gap is significant. Worth a gentle mention.
- **Sleep science connection**: Something in their data connects to an interesting sleep fact they might not know.

Beyond these — if you notice something surprising, a weird anomaly, an emerging trend, a connection between entries that tells a story — go for it. The best notification is one they didn't expect but immediately recognize as true.

## Tone
- Warm, casual, perceptive. Think of a friend who happens to know a lot about sleep.
- Celebrate good nights genuinely. Don't nag about bad ones — people already know.
- Skip the clinical framing. "Your body's probably craving an early night" beats "you have accumulated 3.2 hours of sleep debt."
- Surprise and delight over lecture and guilt. A notification should feel like a gift, not a chore.
- Keep it brief. Titles: 3-5 words. Bodies: 1-2 short sentences. Emojis welcome.

## Decision
If the guardrails rule it out, return sendNotification: false. Otherwise, look at the data and ask: is there something genuinely worth saying right now? Something interesting, timely, or kind? If not, stay quiet. If yes, say it well.`;

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
