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
  utcTime: string,
  localTime: string,
  latitude: string,
  longitude: string,
  timezone: string,
  durationString: string
}

export type SheetsSleepEntry = {
  'Timezone local time': string,
  'Latitude': string,
  'Longitude': string,
  'Timezone': string,
  'UTC time': string,
  'Duration': string
}

export type Notification = {
  title: string,
  body: string
}

export type GoogleSheetsAppendUpdates = {
  spreadsheetId: string,
  updatedRange: string,
  updatedRows: number,
  updatedColumns: number,
  updatedCells: number
}

export type ApiResponse = {
  success: boolean,
  data?: object,
  message?: string
}
