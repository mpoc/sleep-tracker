import { logger } from "@bogeychan/elysia-logger";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { checkReminderLoop } from "./checkReminderLoop";
import {
  checkRequestApiKey,
  getLastSleepRoute,
  getSleepRoute,
  getVapidKeyRoute,
  logSleepRoute,
  replaceLastSleepRoute,
  subscribeRoute,
  unsubscribeRoute,
} from "./controller";
import { handleError } from "./error";
import {
  GeolocationPositionSchema,
  PushSubscription,
  UnsubscribeRequest,
} from "./types";
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
      .post("/sleep", ({ body }) => logSleepRoute(body), {
        body: GeolocationPositionSchema,
      })
      .get("/sleep", () => getSleepRoute())
      .put("/sleep/replace", ({ body }) => replaceLastSleepRoute(body), {
        body: GeolocationPositionSchema,
      })
      .get("/sleep/last", () => getLastSleepRoute())
      .get("/push/vapid-key", () => getVapidKeyRoute())
      .post("/push/subscribe", ({ body }) => subscribeRoute(body), {
        body: PushSubscription,
      })
      .post("/push/unsubscribe", ({ body }) => unsubscribeRoute(body), {
        body: UnsubscribeRequest,
      })
  )
  .get("/", sleepReactHtml)
  .get("/legacy", sleepHtml)
  .use(staticPlugin({ assets: "./src/static/", prefix: "/" }))
  .listen(PORT);

console.log(`Server is listening on ${app.server?.url}`);

checkReminderLoop();
