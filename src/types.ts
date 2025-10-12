import { z } from "zod";

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
    lastRowNumber: z.string().nonempty().transform(Number),
  }),
]);

export type Notification = {
  title: string;
  body: string;
};

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

export type SuccessResponseData =
  | LogSleepRouteResponse
  | GetSleepRouteResponse
  | GetLastSleepRouteResponse
  | ReplaceLastSleepRouteResponse;

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
