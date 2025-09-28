import { serve } from "bun";
import { checkReminderLoop } from "./checkReminderLoop";
import {
  checkRequestApiKey,
  getLastSleepRoute,
  getSleepRoute,
  logSleepRoute,
  replaceLastSleepRoute,
} from "./controller";
import { handleError } from "./error";
import sleepHtml from "./views/sleep.html";
import sleepReactHtml from "./views/sleepReact.html";

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
        return getSleepRoute();
      },
    },
    "/api/sleep/replace": {
      async PUT(req) {
        checkRequestApiKey(req);
        return replaceLastSleepRoute(req);
      },
    },
    "/api/sleep/last": {
      async GET(req) {
        checkRequestApiKey(req);
        return getLastSleepRoute();
      },
    },
    "/": sleepHtml,
    "/react": sleepReactHtml,
  },
  error(error) {
    return handleError(error);
  },
});

console.log(`Server is listening on ${server.url}`);

checkReminderLoop();
