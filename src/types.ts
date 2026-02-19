import { z } from "zod";
import { jsonCodec } from "./jsonCodec";

export const GeolocationPositionSchema = z.object({
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitude: z.number().nullable(),
    accuracy: z.number(),
    altitudeAccuracy: z.number().nullable(),
    heading: z.number().nullable(),
    speed: z.number().nullable(),
  }),
  timestamp: z.number(),
});

export type GeolocationPosition = z.infer<typeof GeolocationPositionSchema>;

export type SleepEntry = {
  utcTime: string;
  localTime: string;
  latitude: string;
  longitude: string;
  timezone: string;
  durationString: string;
};

export const SheetsSleepEntryHeaders = [
  "Timezone local time",
  "Latitude",
  "Longitude",
  "Timezone",
  "UTC time",
  "Duration",
] as const;

export const SheetsSleepEntry = z.object({
  "Timezone local time": z.string(),
  Latitude: z.string(),
  Longitude: z.string(),
  Timezone: z.string(),
  "UTC time": z.string(),
  Duration: z.string().optional(),
});

export type SheetsSleepEntry = z.infer<typeof SheetsSleepEntry>;

export const SheetsLastRowResponse = z.tuple([SheetsSleepEntry]);
export const SheetsPropertiesResponse = z.tuple([
  z.object({
    rowCount: z.string().nonempty().transform(Number),
    sleepEntryCount: z.string().nonempty().transform(Number),
  }),
]);

export const Notification = z.object({
  title: z.string(),
  body: z.string(),
});
export type Notification = z.infer<typeof Notification>;
export const jsonToNotification = jsonCodec(Notification);

export type GoogleSheetsAppendUpdates = {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
};

export const LogSleepRouteResponse = z.object({
  updatedRow: SheetsSleepEntry,
});
export type LogSleepRouteResponse = z.infer<typeof LogSleepRouteResponse>;

export const GetSleepRouteResponse = z.array(SheetsSleepEntry);
export type GetSleepRouteResponse = z.infer<typeof GetSleepRouteResponse>;

export const GetLastSleepRouteResponse = z.object({
  lastSleepEntry: SheetsSleepEntry,
  numberOfSleepEntries: z.number(),
});
export type GetLastSleepRouteResponse = z.infer<typeof GetLastSleepRouteResponse>;

export const ReplaceLastSleepRouteResponse = z.object({
  updatedRow: SheetsSleepEntry,
});
export type ReplaceLastSleepRouteResponse = z.infer<typeof ReplaceLastSleepRouteResponse>;

export const VapidKeyRouteResponse = z.object({
  publicKey: z.string(),
});
export type VapidKeyRouteResponse = z.infer<typeof VapidKeyRouteResponse>;

export type PushSubscribeRouteResponse = Record<string, never>;

export type PushUnsubscribeRouteResponse = Record<string, never>;

export const ErrorResponse = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const NotificationFeedback = z.enum(["useful", "not-useful"]);
export type NotificationFeedback = z.infer<typeof NotificationFeedback>;

export const SentNotification = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  sentAt: z.coerce.date(),
  feedback: NotificationFeedback.optional(),
  feedbackGivenAt: z.coerce.date().optional(),
});
export type SentNotification = z.infer<typeof SentNotification>;
export const jsonToSentNotifications = jsonCodec(z.array(SentNotification));

export const NotificationFeedbackRequest = z.object({
  id: z.string(),
  feedback: NotificationFeedback,
});
export type NotificationFeedbackRequest = z.infer<typeof NotificationFeedbackRequest>;

export type NotificationFeedbackRouteResponse = Record<string, never>;

export const PushSubscription = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscription = z.infer<typeof PushSubscription>;
export const jsonToPushSubscription = jsonCodec(PushSubscription);
export const jsonToPushSubscriptions = jsonCodec(z.array(PushSubscription));

export const UnsubscribeRequest = z.object({
  endpoint: z.url(),
});

export type UnsubscribeRequest = z.infer<typeof UnsubscribeRequest>;
