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

export const circularStatsHours = (hoursArray: number[]) => {
  const n = hoursArray.length;
  let sinSum = 0;
  let cosSum = 0;

  for (const h of hoursArray) {
    const angle = (2 * Math.PI * h) / 24;
    sinSum += Math.sin(angle);
    cosSum += Math.cos(angle);
  }

  const meanSin = sinSum / n;
  const meanCos = cosSum / n;
  const R = Math.sqrt(meanSin ** 2 + meanCos ** 2);

  const meanAngle = Math.atan2(meanSin, meanCos);
  const meanHours = (((meanAngle * 24) / (2 * Math.PI)) % 24 + 24) % 24;

  const stdHours = (Math.sqrt(-2 * Math.log(R)) * 24) / (2 * Math.PI);

  return { meanHours, stdHours };
};

export const getTimezoneFromCoords = (lat: number, lng: number) => {
  const timezone = findTimezone(lat, lng)[0];
  if (!timezone) {
    throw new Error(`Could not find timezone for coordinates: ${lat}, ${lng}`);
  }
  return timezone;
};
