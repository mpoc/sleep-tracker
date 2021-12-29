import geoTz from 'geo-tz';

import { SheetsSleepEntry } from "./types";

export const sheetsSleepEntryIsStop = (entry: SheetsSleepEntry) => !!entry['Duration'];

const sleepEntryToDateObj = (sleepEntry: SheetsSleepEntry) => {
  const [date, time] = sleepEntry['UTC time'].split(" ");
  const formattedUTCDate = date + "T" + time + "Z";
  return new Date(formattedUTCDate);
}

export const millisecondsSinceSleepEntry = (sleepEntry: SheetsSleepEntry) => {
  const sleepEntryDateObj = sleepEntryToDateObj(sleepEntry);
  // https://stackoverflow.com/a/60688789/12108012
  const msDiff = new Date().valueOf() - sleepEntryDateObj.valueOf();
  return msDiff;
}

export const millisecondsToHours = (milliseconds: number) => milliseconds / 1000 / 60 / 60;
export const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;

export const getTimezoneFromCoords = (lat: number, lng: number): string => geoTz.find(lat, lng)[0];
