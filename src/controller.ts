import assert from "node:assert/strict";
import moment from "moment-timezone";
import { successResponse } from "./apiUtils";
import { env } from "./config";
import { ApiError } from "./error";
import { sendEntryNotification } from "./notifications";
import {
  append,
  getArray,
  getLastRow,
  getObjectArray,
  getObjectArrayHeader,
  getRowCount,
  getSheetsObj,
  update,
} from "./sheets";
import {
  type GeolocationPosition,
  GeolocationPositionSchema,
  type GoogleSheetsAppendUpdates,
  SheetsSleepEntry,
  type SleepEntry,
} from "./types";
import { getTimezoneFromCoords } from "./utils";

export const logSleepRoute = async (req: Request) => {
  const data: GeolocationPosition = GeolocationPositionSchema.parse(
    await req.json()
  );
  const entry = getSleepEntryFromGeolocationPosition(data);

  const valuesToAppend = [Object.values(entry)];

  const sheetsObj = await getSheetsObj();

  const result = await append(
    sheetsObj,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE,
    valuesToAppend
  ).catch((error) => {
    throw new ApiError("Failed to append rows to Google Sheet", error);
  });

  assert(result, "Append result should be present");
  assert(result.updatedRange, "Updated range should be present");

  const updatedRowsResponse = await getObjectArrayHeader(
    sheetsObj,
    env.SPREADSHEET_ID,
    result.updatedRange
  ).catch((error) => {
    throw new ApiError("Failed to retrieve row after writing", error);
  });

  const updatedRows = SheetsSleepEntry.array().parse(updatedRowsResponse);
  const updatedRow = updatedRows.at(0);
  assert(updatedRow, "Updated row should be present");

  sendEntryNotification(updatedRow);

  return successResponse({ updatedRow }, "Successfully added sleep entry");
};

export const getSleepRoute = async () => {
  const sheetsObj = await getSheetsObj();

  const result = await getObjectArray(
    sheetsObj,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE
  ).catch((error: Error) => {
    throw new ApiError("Failed to retrieve rows", error);
  });

  const response = SheetsSleepEntry.array().parse(result);

  return successResponse(response, "Successfully retrieved sleep entries");
};

export const getLastSleep = async () => {
  const sheetsObj = await getSheetsObj();

  const lastRow = getLastRow(sheetsObj, env.SPREADSHEET_ID).catch((error) => {
    throw new ApiError("Failed to retrieve last row", error);
  });

  const rowCount = getRowCount(sheetsObj, env.SPREADSHEET_ID).catch((error) => {
    throw new ApiError("Failed to retrieve row count", error);
  });

  const lastSleepData = {
    lastSleepEntry: await lastRow,
    numberOfSleepEntries: await rowCount,
  };

  return lastSleepData;
};

export const getLastSleepRoute = async () => {
  const lastSleepData = await getLastSleep();
  return successResponse(
    lastSleepData,
    "Successfully retrieved last sleep entry"
  );
};

export const replaceLastSleepRoute = async (req: Request) => {
  const data: GeolocationPosition = GeolocationPositionSchema.parse(
    await req.json()
  );
  const entry = getSleepEntryFromGeolocationPosition(data);

  const valuesToAppend = [Object.values(entry)];

  const sheetsObj = await getSheetsObj();

  const rows = await getArray(
    sheetsObj,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE
  ).catch((error: Error) => {
    throw new ApiError("Failed to retrieve rows", error);
  });

  const rangeToUpdate = getLastRowRange(rows);

  const result = await update(
    sheetsObj,
    env.SPREADSHEET_ID,
    rangeToUpdate,
    valuesToAppend
  ).catch((error) => {
    throw new ApiError("Failed to update rows", error);
  });

  assert(result.updatedRange, "Updated range should be present");

  const updatedRowsResponse = await getObjectArrayHeader(
    sheetsObj,
    env.SPREADSHEET_ID,
    result.updatedRange
  ).catch((error) => {
    throw new ApiError("Failed to retrieve row after updating", error);
  });

  const updatedRows = SheetsSleepEntry.array().parse(updatedRowsResponse);
  const updatedRow = updatedRows.at(0);
  assert(updatedRow, "Updated row should be present");

  sendEntryNotification(updatedRow);

  return successResponse(
    { updatedRow },
    "Successfully replaced last sleep entry"
  );
};

const getSleepEntryFromGeolocationPosition = (
  geolocationPosition: GeolocationPosition
): SleepEntry => {
  const timezoneName = getTimezoneFromCoords(
    geolocationPosition.coords.latitude,
    geolocationPosition.coords.longitude
  );

  const utcTime = moment.utc(geolocationPosition.timestamp);
  const localTime = utcTime.clone().tz(timezoneName);

  const durationFormula = `
    (
      INDIRECT(ADDRESS(ROW(), COLUMN() - 1, 4)) -
      INDIRECT(ADDRESS(ROW() - 1, COLUMN() - 1, 4))
    )
  `;
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
  `;
  const entry: SleepEntry = {
    localTime: localTime.format("YYYY-MM-DD HH:mm:ss"),
    latitude: String(geolocationPosition.coords.latitude),
    longitude: String(geolocationPosition.coords.longitude),
    timezone: timezoneName,
    utcTime: utcTime.format("YYYY-MM-DD HH:mm:ss"),
    durationString: formula.replace(/\s/g, ""),
  };

  return entry;
};

export const checkRequestApiKey = (req: Request) => {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get("apiKey");
  if (apiKey !== env.API_KEY) {
    throw new ApiError("Invalid API key");
  }
};

const getLastRowRange = (rows: any[]) => {
  const A_CHAR_CODE = "A".charCodeAt(0);
  const Z_CHAR_CODE = "Z".charCodeAt(0);

  const lastColumnCharNumber = A_CHAR_CODE + (rows[0].length - 1);
  // Limit in case there's columns in AA+ territory
  const limitedColumnCharNumber =
    lastColumnCharNumber > Z_CHAR_CODE ? Z_CHAR_CODE : lastColumnCharNumber;
  const lastColumn = String.fromCharCode(limitedColumnCharNumber);
  const lastRowRange = `A${rows.length}:${lastColumn}`;
  return lastRowRange;
};
