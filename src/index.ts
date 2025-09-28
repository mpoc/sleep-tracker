import { serve } from "bun";
import dotenv from 'dotenv-safe';
import path from 'path';

import { logSleepRoute, replaceLastSleepRoute, getSleepRoute, getLastSleepRoute, checkRequestApiKey } from './controller';
import { handleError } from './error';
import { checkReminderLoop } from "./checkReminderLoop";
import sleepHtml from './views/sleep.html';

dotenv.config({
  path: path.resolve(__dirname, '..', 'secret/.env'),
  example: path.resolve(__dirname, '..', 'secret/.env.example'),
});

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
    "/": sleepHtml,
  },
  error(error) {
    return handleError(error);
  },
});

console.log(`Server is listening on ${server.url}`);

checkReminderLoop();
