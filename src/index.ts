import { logger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";
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

const PORT = 8000;

const app = new Elysia()
  .use(logger())
  .onError(({ error, code }) => {
    if (code === "INTERNAL_SERVER_ERROR") {
      return handleError(error);
    }

    return Response.json({ message: error.toString() }, { status: 500 });
  })
  .post("/api/sleep", (req) => {
    checkRequestApiKey(req.request);
    return logSleepRoute(req.request);
  })
  .get("/api/sleep", (req) => {
    checkRequestApiKey(req.request);
    return getSleepRoute();
  })
  .put("/api/sleep/replace", (req) => {
    checkRequestApiKey(req.request);
    return replaceLastSleepRoute(req.request);
  })
  .get("/api/sleep/last", (req) => {
    checkRequestApiKey(req.request);
    return getLastSleepRoute();
  })
  .get("/", sleepHtml)
  .get("/react", sleepReactHtml)
  .listen(PORT);

console.log(`Server is listening on ${app.server?.url}`);

checkReminderLoop();
