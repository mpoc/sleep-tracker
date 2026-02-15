import { bearer } from "@elysiajs/bearer";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import logixlysia from "logixlysia";
import { aiNotificationLoop } from "./aiNotifications";
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
import { UnauthorizedError } from "./error";
import {
  GeolocationPositionSchema,
  PushSubscription,
  UnsubscribeRequest,
} from "./types";
import sleepReactHtml from "./views/sleepReact.html";

const PORT = 8000;

new Elysia()
  .use(
    logixlysia({
      config: {
        startupMessageFormat: "simple",
        ip: true,
      },
    })
  )
  .error({ UnauthorizedError })
  .onError(({ code, error, set }) => {
    console.error(error);
    const message = Error.isError(error) ? error.message : String(error);
    if (code === "UnauthorizedError") {
      set.status = 401;
    } else {
      set.status = 500;
    }
    return { error: message };
  })
  .group("/api", (route) =>
    route
      .use(bearer())
      .guard({ beforeHandle: ({ bearer }) => checkRequestApiKey(bearer) })
      .post("/sleep", ({ body }) => logSleepRoute(body), {
        body: GeolocationPositionSchema,
      })
      .get("/sleep", ({ query }) => {
        const offset = query.offset ? Number(query.offset) : undefined;
        const limit = query.limit ? Number(query.limit) : undefined;
        return getSleepRoute({ offset, limit });
      })
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
  .use(staticPlugin({ assets: "./src/static/", prefix: "/" }))
  .listen(PORT);

checkReminderLoop();
aiNotificationLoop();
