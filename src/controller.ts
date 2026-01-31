import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import moment from "moment-timezone";
import { successResponse } from "./apiUtils";
import { env } from "./config";
import { ApiError } from "./error";
import { sendEntryNotification } from "./notifications";
import { addSubscription, removeSubscription } from "./pushSubscriptions";
import {
  append,
  getLastRow,
  getObjectArray,
  getProperties,
  getSheets,
  toObjectArray,
  update,
} from "./sheets";
import {
  type GeolocationPosition,
  type PushSubscription,
  SheetsSleepEntry,
  SheetsSleepEntryHeaders,
  type SleepEntry,
} from "./types";
import { getTimezoneFromCoords } from "./utils";
import { getVapidPublicKey } from "./webPush";

export const logSleepRoute = async (position: GeolocationPosition) => {
  const entry = getSleepEntryFromGeolocationPosition(position);

  const valuesToAppend = [Object.values(entry)];

  const sheets = await getSheets();

  const result = await append(
    sheets,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE,
    valuesToAppend
  ).catch((error) => {
    throw new ApiError("Failed to append rows to Google Sheet", error);
  });

  const updatedRowsResponse = toObjectArray(
    result?.updatedData?.values ?? [],
    SheetsSleepEntryHeaders
  );

  const [updatedRow] = SheetsSleepEntry.array().parse(updatedRowsResponse);
  assert(updatedRow, "Updated row should be present");

  sendEntryNotification(updatedRow);

  return successResponse({ updatedRow }, "Successfully added sleep entry");
};

export const getSleepRoute = async () => {
  const sheets = await getSheets();

  const result = await getObjectArray(
    sheets,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE
  ).catch((error: Error) => {
    throw new ApiError("Failed to retrieve rows", error);
  });

  const response = SheetsSleepEntry.array().parse(result);

  return successResponse(response, "Successfully retrieved sleep entries");
};

export const getLastSleep = async () => {
  const sheets = await getSheets();

  const lastRow = getLastRow(sheets, env.SPREADSHEET_ID).catch((error) => {
    throw new ApiError("Failed to retrieve last row", error);
  });

  const properties = getProperties(sheets, env.SPREADSHEET_ID).catch(
    (error) => {
      throw new ApiError("Failed to retrieve properties", error);
    }
  );

  return {
    lastSleepEntry: await lastRow,
    numberOfSleepEntries: (await properties).sleepEntryCount,
  };
};

export const getLastSleepRoute = async () => {
  const lastSleepData = await getLastSleep();
  return successResponse(
    lastSleepData,
    "Successfully retrieved last sleep entry"
  );
};

export const replaceLastSleepRoute = async (position: GeolocationPosition) => {
  const entry = getSleepEntryFromGeolocationPosition(position);
  const rowToUpdate = [
    entry.localTime,
    entry.latitude,
    entry.longitude,
    entry.timezone,
    entry.utcTime,
    entry.durationString,
  ];

  const sheets = await getSheets();

  const properties = await getProperties(sheets, env.SPREADSHEET_ID).catch(
    (error) => {
      throw new ApiError("Failed to retrieve properties", error);
    }
  );

  const rangeToUpdate = getLastRowRange({
    rowCount: properties.rowCount,
    columnCount: rowToUpdate.length,
  });

  const result = await update(sheets, env.SPREADSHEET_ID, rangeToUpdate, [
    rowToUpdate,
  ]).catch((error) => {
    throw new ApiError("Failed to update rows", error);
  });

  const updatedRowsResponse = toObjectArray(
    result?.updatedData?.values ?? [],
    SheetsSleepEntryHeaders
  );

  const [updatedRow] = SheetsSleepEntry.array().parse(updatedRowsResponse);
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

export const checkRequestApiKey = (apiKey?: string) => {
  if (!apiKey) {
    throw new ApiError("Invalid API key");
  }

  if (apiKey.length !== env.API_KEY.length) {
    throw new ApiError("Invalid API key");
  }

  const apiKeyValid = timingSafeEqual(
    Buffer.from(apiKey),
    Buffer.from(env.API_KEY)
  );
  if (!apiKeyValid) {
    throw new ApiError("Invalid API key");
  }
};

const getLastRowRange = ({
  rowCount,
  columnCount,
}: {
  rowCount: number;
  columnCount: number;
}) => {
  const A_CHAR_CODE = "A".charCodeAt(0);
  const Z_CHAR_CODE = "Z".charCodeAt(0);

  const lastColumnCharNumber = A_CHAR_CODE + columnCount - 1;
  // Limit in case there's columns in AA+ territory
  const limitedColumnCharNumber =
    lastColumnCharNumber > Z_CHAR_CODE ? Z_CHAR_CODE : lastColumnCharNumber;
  const lastColumn = String.fromCharCode(limitedColumnCharNumber);
  return `A${rowCount}:${lastColumn}`;
};

export const getVapidKeyRoute = () => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    throw new ApiError("VAPID keys not configured");
  }
  return successResponse({ publicKey }, "VAPID public key retrieved");
};

export const subscribeRoute = async (subscription: PushSubscription) => {
  await addSubscription(subscription);
  return successResponse({}, "Subscription added");
};

export const unsubscribeRoute = async (body: { endpoint: string }) => {
  await removeSubscription(body.endpoint);
  return successResponse({}, "Subscription removed");
};
