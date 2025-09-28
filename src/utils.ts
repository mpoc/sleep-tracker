// Bun build fails if this is an import, temporary workaround is to use dynamic import
// import { find as findTimezone } from 'geo-tz';
const { find: findTimezone } = await import("geo-tz");

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

export const millisecondsToHours = (milliseconds: number) =>
  // biome-ignore lint/style/noMagicNumbers: <milliseconds in hour>
  milliseconds / 1000 / 60 / 60;
// biome-ignore lint/style/noMagicNumbers: <milliseconds in minute>
export const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;

export const getTimezoneFromCoords = (lat: number, lng: number) => {
  const timezone = findTimezone(lat, lng)[0];
  if (!timezone) {
    throw new Error(`Could not find timezone for coordinates: ${lat}, ${lng}`);
  }
  return timezone;
};
