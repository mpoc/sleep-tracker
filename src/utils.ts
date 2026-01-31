// Bun build fails if this is an import, temporary workaround is to use dynamic import
// import { find as findTimezone } from 'geo-tz';
const { find: findTimezone } = await import("geo-tz");

import z from "zod";
import type { SheetsSleepEntry } from "./types";

export const sheetsSleepEntryIsStop = (entry: SheetsSleepEntry) =>
  !!entry.Duration;

const sleepEntryToDateObj = (sleepEntry: SheetsSleepEntry) => {
  const [date, time] = sleepEntry["UTC time"].split(" ");
  const formattedUTCDate = `${date}T${time}Z`;
  return new Date(formattedUTCDate);
};

export const millisecondsSinceSleepEntry = (sleepEntry: SheetsSleepEntry) => {
  const sleepEntryDateObj = sleepEntryToDateObj(sleepEntry);
  // https://stackoverflow.com/a/60688789/12108012
  const msDiff = Date.now() - sleepEntryDateObj.valueOf();
  return msDiff;
};

export const getTimezoneFromCoords = (lat: number, lng: number) => {
  const timezone = findTimezone(lat, lng)[0];
  if (!timezone) {
    throw new Error(`Could not find timezone for coordinates: ${lat}, ${lng}`);
  }
  return timezone;
};

/**
 * Parses JSON strings into structured data and serializes back to JSON. This generic function accepts an output schema to validate the parsed JSON data.
 */
export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
