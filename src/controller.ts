import moment from 'moment-timezone';
import assert from 'node:assert';

import {
  getSheetsObj,
  getObjectArrayHeader,
  getObjectArray,
  getArray,
  append,
  update,
  deleteRow
} from './sheets';
import { successResponse, errorResponse } from './apiUtils';
import { ApiError } from "./error";
import { type GeolocationPosition, type SheetsSleepEntry, type SleepEntry, type GoogleSheetsAppendUpdates, type Notification, GeolocationPositionSchema } from './types';
import { sendEntryNotification, sendDeleteNotification } from './notifications';
import { getTimezoneFromCoords } from "./utils";
import type { BunRequest } from "bun";

export const logSleepRoute = async (req: BunRequest) => {
  const data: GeolocationPosition = GeolocationPositionSchema.parse(await req.json());
  const entry = getSleepEntryFromGeolocationPosition(data);

  const valuesToAppend = [ Object.values(entry) ];

  const sheetsObj = await getSheetsObj()

  const result: GoogleSheetsAppendUpdates = await append(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    process.env.SPREADSHEET_RANGE!,
    valuesToAppend
  ).catch(error => {
    throw new ApiError("Failed to append rows to Google Sheet", error);
  });

  const updatedRows = await getObjectArrayHeader(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    result.updatedRange
  ).catch(error => {
    throw new ApiError('Failed to retrieve row after writing', error);
  });

  const response = {
    updatedRow: updatedRows[0] as SheetsSleepEntry
  }

  await sendEntryNotification(response.updatedRow);

  return successResponse(response, "Successfully added sleep entry")
};

export const getSleepRoute = async (req: BunRequest) => {
  const sheetsObj = await getSheetsObj()

  const result: SheetsSleepEntry[] = await getObjectArray(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    process.env.SPREADSHEET_RANGE!,
  ).catch((error: Error) => {
    throw new ApiError('Failed to retrieve rows', error);
  });

  const response = result;

  return successResponse(response, "Successfully retrieved sleep entries")
};

export const getLastSleep = async () => {
  const sheetsObj = await getSheetsObj()

  const result: SheetsSleepEntry[] = await getObjectArray(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    process.env.SPREADSHEET_RANGE!,
  ).catch((error: Error) => {
    throw new ApiError('Failed to retrieve rows', error);
  });

  const lastSleepEntry = result.at(-1);
  assert(lastSleepEntry);

  const lastSleepData = {
    lastSleepEntry,
    numberOfSleepEntries: result.length,
  };

  return lastSleepData
};

export const getLastSleepRoute = async (req: BunRequest) => {
  const lastSleepData = await getLastSleep();
  return successResponse(lastSleepData, "Successfully retrieved last sleep entry")
};

export const replaceLastSleepRoute = async (req: BunRequest) => {
  const data: GeolocationPosition = GeolocationPositionSchema.parse(await req.json());
  const entry = getSleepEntryFromGeolocationPosition(data);

  const valuesToAppend = [ Object.values(entry) ];

  const sheetsObj = await getSheetsObj()

  const rows = await getArray(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    process.env.SPREADSHEET_RANGE!,
  ).catch((error: Error) => {
    throw new ApiError('Failed to retrieve rows', error);
  });

  const rangeToUpdate = getLastRowRange(rows);

  const result: GoogleSheetsAppendUpdates = await update(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    rangeToUpdate,
    valuesToAppend
  ).catch(error => {
    throw new ApiError("Failed to update rows", error);
  });

  const updatedRows = await getObjectArrayHeader(
    sheetsObj,
    process.env.SPREADSHEET_ID!,
    result.updatedRange
  ).catch(error => {
    throw new ApiError('Failed to retrieve row after updating', error);
  });

  const response = {
    updatedRow: updatedRows[0] as SheetsSleepEntry
  }

  await sendEntryNotification(response.updatedRow);

  return successResponse(response, "Successfully replaced last sleep entry")
};

const getSleepEntryFromGeolocationPosition = (geolocationPosition: GeolocationPosition): SleepEntry => {
  const timezoneName = getTimezoneFromCoords(geolocationPosition.coords.latitude, geolocationPosition.coords.longitude);

  const utcTime = moment.utc(geolocationPosition.timestamp);
  const localTime = utcTime.clone().tz(timezoneName);

  const durationFormula = `
    (
      INDIRECT(ADDRESS(ROW(), COLUMN() - 1, 4)) -
      INDIRECT(ADDRESS(ROW() - 1, COLUMN() - 1, 4))
    )
  `
  const formula = `
    =IF(
      ISODD(ROW()),
      IF(
        ${durationFormula} < 0,
        "N/A",
        ${durationFormula}
      ),
      ""
    )
  `
  const entry: SleepEntry = {
    localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
    latitude: String(geolocationPosition.coords.latitude),
    longitude: String(geolocationPosition.coords.longitude),
    timezone: timezoneName,
    utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
    durationString: formula.replace(/\s/g, '')
  };

  return entry;
};

export const checkRequestApiKey = (req: BunRequest) => {
  const { searchParams } = new URL(req.url)
  const apiKey = searchParams.get("apiKey");
  if (apiKey != process.env.API_KEY) {
    throw new ApiError('Invalid API key');
  }
};

const getLastRowRange = (rows: any[]) => {
  const A_CHAR_CODE = "A".charCodeAt(0)
  const Z_CHAR_CODE = "Z".charCodeAt(0)

  const lastColumnCharNumber = A_CHAR_CODE + (rows[0].length - 1);
  // Limit in case there's columns in AA+ territory
  const limitedColumnCharNumber = lastColumnCharNumber > Z_CHAR_CODE ? Z_CHAR_CODE : lastColumnCharNumber
  const lastColumn = String.fromCharCode(limitedColumnCharNumber);
  const lastRowRange = `A${rows.length}:${lastColumn}`;
  return lastRowRange;
};
