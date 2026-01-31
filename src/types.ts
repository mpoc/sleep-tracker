import { z } from "zod";
import { jsonCodec } from "./utils";

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

export type LogSleepRouteResponse = {
  updatedRow: SheetsSleepEntry;
};

export type GetSleepRouteResponse = SheetsSleepEntry[];

export type GetLastSleepRouteResponse = {
  lastSleepEntry: SheetsSleepEntry;
  numberOfSleepEntries: number;
};

export type ReplaceLastSleepRouteResponse = {
  updatedRow: SheetsSleepEntry;
};

export type VapidKeyRouteResponse = {
  publicKey: string;
};

export type PushSubscribeRouteResponse = Record<string, never>;

export type PushUnsubscribeRouteResponse = Record<string, never>;

export type SuccessResponseData =
  | LogSleepRouteResponse
  | GetSleepRouteResponse
  | GetLastSleepRouteResponse
  | ReplaceLastSleepRouteResponse
  | VapidKeyRouteResponse
  | PushSubscribeRouteResponse
  | PushUnsubscribeRouteResponse;

export type ApiResponse<T extends SuccessResponseData = SuccessResponseData> =
  | {
      success: true;
      data: T;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

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
