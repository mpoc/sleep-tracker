import { logger } from "@bogeychan/elysia-logger";
import { staticPlugin } from "@elysiajs/static";
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
  .group("/api", (route) =>
    route
      .guard({ beforeHandle: ({ request }) => checkRequestApiKey(request) })
      .post("/sleep", ({ request }) => logSleepRoute(request))
      .get("/sleep", () => getSleepRoute())
      .put("/sleep/replace", ({ request }) => replaceLastSleepRoute(request))
      .get("/sleep/last", () => getLastSleepRoute())
  )
  .get("/", sleepHtml)
  .get("/react", sleepReactHtml)
  .use(staticPlugin({ assets: "./src/static/", prefix: "/" }))
  .listen(PORT);

console.log(`Server is listening on ${app.server?.url}`);

checkReminderLoop();
