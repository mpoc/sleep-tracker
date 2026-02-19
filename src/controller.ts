import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import moment from "moment-timezone";
import { env } from "./config";
import { UnauthorizedError } from "./error";
import { sendEntryNotification } from "./notifications";
import { addSubscription, removeSubscription } from "./pushSubscriptions";
import {
  append,
  getLastNRows,
  getLastRow,
  getObjectArray,
  getProperties,
  getSheets,
  toObjectArray,
  update,
} from "./sheets";
import {
  type GeolocationPosition,
  type NotificationFeedbackRequest,
  type PushSubscription,
  SheetsSleepEntry,
  SheetsSleepEntryHeaders,
  type SleepEntry,
  jsonToSentNotifications,
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
  ).catch((cause) => {
    throw new Error("Failed to append rows to Google Sheet", { cause });
  });

  const updatedRowsResponse = toObjectArray(
    result?.updatedData?.values ?? [],
    SheetsSleepEntryHeaders
  );

  const [updatedRow] = SheetsSleepEntry.array().parse(updatedRowsResponse);
  assert(updatedRow, "Updated row should be present");

  sendEntryNotification(updatedRow);

  return { updatedRow };
};

export const getRecentSleepEntries = async (count: number) => {
  const sheets = await getSheets();
  const result = await getLastNRows(
    sheets,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE,
    count
  ).catch((cause) => {
    throw new Error("Failed to retrieve recent rows", { cause });
  });
  return SheetsSleepEntry.array().parse(result);
};

export const getSleepRoute = async (options?: {
  offset?: number;
  limit?: number;
}) => {
  const sheets = await getSheets();

  if (options?.limit !== undefined) {
    const effectiveCount = options.limit + (options.offset ?? 0);
    const result = await getLastNRows(
      sheets,
      env.SPREADSHEET_ID,
      env.SPREADSHEET_RANGE,
      effectiveCount
    ).catch((cause) => {
      throw new Error("Failed to retrieve rows", { cause });
    });

    const parsed = SheetsSleepEntry.array().parse(result);

    if (options.offset) {
      return parsed.slice(0, parsed.length - options.offset);
    }
    return parsed;
  }

  const result = await getObjectArray(
    sheets,
    env.SPREADSHEET_ID,
    env.SPREADSHEET_RANGE
  ).catch((cause) => {
    throw new Error("Failed to retrieve rows", { cause });
  });

  return SheetsSleepEntry.array().parse(result);
};

export const getLastSleep = async () => {
  const sheets = await getSheets();

  const lastRow = getLastRow(sheets, env.SPREADSHEET_ID).catch((cause) => {
    throw new Error("Failed to retrieve last row", { cause });
  });

  const properties = getProperties(sheets, env.SPREADSHEET_ID).catch(
    (cause) => {
      throw new Error("Failed to retrieve properties", { cause });
    }
  );

  return {
    lastSleepEntry: await lastRow,
    numberOfSleepEntries: (await properties).sleepEntryCount,
  };
};

export const getLastSleepRoute = async () => {
  return await getLastSleep();
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
    (cause) => {
      throw new Error("Failed to retrieve properties", { cause });
    }
  );

  const rangeToUpdate = getLastRowRange({
    rowCount: properties.rowCount,
    columnCount: rowToUpdate.length,
  });

  const result = await update(sheets, env.SPREADSHEET_ID, rangeToUpdate, [
    rowToUpdate,
  ]).catch((cause) => {
    throw new Error("Failed to update rows", { cause });
  });

  const updatedRowsResponse = toObjectArray(
    result?.updatedData?.values ?? [],
    SheetsSleepEntryHeaders
  );

  const [updatedRow] = SheetsSleepEntry.array().parse(updatedRowsResponse);
  assert(updatedRow, "Updated row should be present");

  sendEntryNotification(updatedRow);

  return { updatedRow };
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
    throw new UnauthorizedError("Invalid API key");
  }

  if (apiKey.length !== env.API_KEY.length) {
    throw new UnauthorizedError("Invalid API key");
  }

  const apiKeyValid = timingSafeEqual(
    Buffer.from(apiKey),
    Buffer.from(env.API_KEY)
  );
  if (!apiKeyValid) {
    throw new UnauthorizedError("Invalid API key");
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
    throw new Error("VAPID keys not configured");
  }
  return { publicKey };
};

export const subscribeRoute = async (subscription: PushSubscription) => {
  await addSubscription(subscription);
  return {};
};

export const unsubscribeRoute = async (body: { endpoint: string }) => {
  await removeSubscription(body.endpoint);
  return {};
};

const NOTIFICATIONS_PATH = "./data/sent-notifications.json";

export const notificationFeedbackRoute = async (
  body: NotificationFeedbackRequest
) => {
  console.log(`Notification feedback received:`, JSON.stringify(body));
  const data = await Bun.file(NOTIFICATIONS_PATH).text();
  const all = jsonToSentNotifications.decode(data);

  const entry = all.find((n) => n.id === body.id);
  if (!entry) {
    throw new Error("Notification not found");
  }

  if (entry.feedback) {
    return {};
  }

  entry.feedback = body.feedback;
  entry.feedbackGivenAt = new Date();

  await Bun.write(NOTIFICATIONS_PATH, jsonToSentNotifications.encode(all));

  return {};
};
