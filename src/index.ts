import { serve } from "bun";
import pug from 'pug';
import dotenv from 'dotenv-safe';
import path from 'path';

import { logSleepRoute, replaceLastSleepRoute, getSleepRoute, getLastSleepRoute, getLastSleep, checkRequestApiKey } from './controller';
import { sendReminderNotification } from './notifications';
import { handleError } from './error';
import { millisecondsSinceSleepEntry, millisecondsToHours, minutesToMilliseconds, sheetsSleepEntryIsStop } from './utils';

dotenv.config({
  path: path.resolve(__dirname, '..', 'secret/.env'),
  example: path.resolve(__dirname, '..', 'secret/.env.example'),
});

const sleepHtml = pug.renderFile("./src/views/sleep.pug");

const server = serve({
  port: "8000",
  routes: {
    "/api/sleep": {
      async POST(req) {
        checkRequestApiKey(req);
        return logSleepRoute(req);
      },
      async GET(req) {
        checkRequestApiKey(req);
        return getSleepRoute(req);
      },
    },
    "/api/sleep/replace": {
      async PUT(req) {
        checkRequestApiKey(req);
        return replaceLastSleepRoute(req);
      }
    },
    "/api/sleep/last": {
      async GET(req) {
        checkRequestApiKey(req);
        return getLastSleepRoute(req);
      }
    },
    "/": async () => {
      return new Response(sleepHtml, {
        headers: { "Content-Type": "text/html" }
      });
    },
    "/js/*": async (req) => {
      const url = new URL(req.url);
      const file = Bun.file(`./src/views${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("Not Found", { status: 404 });
    },
    "/*": async (req) => {
      const url = new URL(req.url);
      const staticFile = Bun.file(`./src/static${url.pathname}`);
      if (await staticFile.exists()) {
        return new Response(staticFile);
      }
      return new Response("Not Found", { status: 404 });
    },
  },
  error(error) {
    return handleError(error);
  },
});

console.log(`Server is listening on ${server.url}`);

const HOURS_BEFORE_START_REMINDER = 15.5;
const HOURS_BEFORE_STOP_REMINDER = 8.5;
const REMINDER_CHECK_INTERVAL_MINUTES = 5;

let reminderNotificationSent = false;

const checkReminderNotification = async () => {
  const lastSleepData = await getLastSleep();

  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(lastSleepData.lastSleepEntry);

  const msDiff = millisecondsSinceSleepEntry(lastSleepData.lastSleepEntry);
  const hoursDiff = millisecondsToHours(msDiff);

  const hoursBeforeReminder = lastSleepEntryIsStop ? HOURS_BEFORE_START_REMINDER : HOURS_BEFORE_STOP_REMINDER;

  // console.log(`${new Date().toISOString()}: Checking ${lastSleepEntryIsStop ? 'start' : 'stop'} reminder notification ${hoursDiff} (${hoursBeforeReminder})`)
  if (hoursDiff > hoursBeforeReminder) {
    if (!reminderNotificationSent) {
      console.log(`${new Date().toISOString()}: Sending ${lastSleepEntryIsStop ? 'start' : 'stop'} reminder notification`)
      reminderNotificationSent = true;
      await sendReminderNotification(msDiff, lastSleepEntryIsStop);
    }
  } else {
    reminderNotificationSent = false;
  }
};

const checkReminderLoop = () => {
  checkReminderNotification();
  setTimeout(checkReminderLoop, minutesToMilliseconds(REMINDER_CHECK_INTERVAL_MINUTES));
};

checkReminderLoop();
