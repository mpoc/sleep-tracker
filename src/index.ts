import "./ensureDataDir";
import { bearer } from "@elysiajs/bearer";
import { Elysia } from "elysia";
import logixlysia from "logixlysia";
import swJs from "./static/sw.js" with { type: "file" };
import ms from "ms";
import { startAiNotificationCron } from "./aiNotifications";
import { checkReminderLoop } from "./checkReminderLoop";
import {
  checkRequestApiKey,
  getLastSleepRoute,
  getNotificationRoute,
  getSleepRoute,
  getVapidKeyRoute,
  logSleepRoute,
  notificationFeedbackRoute,
  replaceLastSleepRoute,
  subscribeRoute,
  unsubscribeRoute,
} from "./controller";
import { UnauthorizedError } from "./error";
import { getRecentNotifications } from "./notificationDb";
import {
  GeolocationPositionSchema,
  NotificationFeedbackRequest,
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
  .get("/api/notifications/all", ({ query }) => {
    checkRequestApiKey(query.apiKey);
    return getRecentNotifications(Number.POSITIVE_INFINITY);
  })
  .get("/api/notifications/recent", ({ query }) => {
    checkRequestApiKey(query.apiKey);
    return getRecentNotifications(ms("7 days"));
  })
  .get("/api/notifications/:id", ({ params }) =>
    getNotificationRoute(params.id)
  )
  .post(
    "/api/notifications/feedback",
    ({ body }) => notificationFeedbackRoute(body),
    { body: NotificationFeedbackRequest }
  )
  .get("/notifications", sleepReactHtml)
  .get("/notification-feedback", sleepReactHtml)
  .get("/", sleepReactHtml)
  .get("/*", async ({ params, set }) => {
    const name = params["*"];
    for (const blob of Bun.embeddedFiles) {
      if (blob.name === name) {
        return new Response(blob);
      }
    }
    const embeddedByImport: Record<string, string> = { "sw.js": swJs };
    if (name in embeddedByImport) {
      return new Response(Bun.file(embeddedByImport[name]));
    }
    const file = Bun.file(`./src/static/${name}`);
    if (await file.exists()) {
      return new Response(file);
    }
    set.status = 404;
    return "Not found";
  })
  .listen(PORT);

checkReminderLoop();
startAiNotificationCron();
