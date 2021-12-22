import { Request, Response, NextFunction } from "express";
import moment from 'moment-timezone';
import geoTz from 'geo-tz';
//@ts-ignore
import PushBullet from 'pushbullet';

import {
  getSheetsObj,
  getObjectArrayHeader,
  getObjectArray,
  getArray,
  append,
  GoogleSheetsAppendUpdates,
  update,
  deleteRow
} from './sheets';
import { successResponse, errorResponse } from './utils';
import { ApiError } from "./error";

type GeolocationPosition = {
  coords: {
      latitude: number,
      longitude: number,
      altitude: number,
      accuracy: number,
      altitudeAccuracy: number,
      heading: number,
      speed: number,
  },
  timestamp: number
}

type SleepEntry = {
  utcTime: string,
  localTime: string,
  latitude: string,
  longitude: string,
  timezone: string,
  durationString: string
}

type SheetsSleepEntry = {
  'Timezone local time': string,
  'Latitude': string,
  'Longitude': string,
  'Timezone': string,
  'UTC time': string,
  'Duration': string
}

export const logSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    checkRequestApiKey(req);

    const data: GeolocationPosition = req.body;
    const entry = getSleepEntryFromGeolocationPosition(data);

    const valuesToAppend = [ Object.values(entry) ];

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });
    
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

    successResponse(res, response, "Successfully added sleep entry")
  } catch (error) {
    next(error);
  }
};

export const getSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    checkRequestApiKey(req);

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });

    const result = await getObjectArray(
      sheetsObj,
      process.env.SPREADSHEET_ID!,
      process.env.SPREADSHEET_RANGE!,
    ).catch((error: Error) => {
      throw new ApiError('Failed to retrieve rows', error);
    });
    
    const response = result;

    successResponse(res, response, "Successfully retrieved sleep entries")
  } catch (error) {
    next(error);
  }
};

export const getLastSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    checkRequestApiKey(req);

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });

    const result = await getObjectArray(
      sheetsObj,
      process.env.SPREADSHEET_ID!,
      process.env.SPREADSHEET_RANGE!,
    ).catch((error: Error) => {
      throw new ApiError('Failed to retrieve rows', error);
    });

    const response = result[result.length - 1];

    successResponse(res, response, "Successfully retrieved last sleep entry")
  } catch (error) {
    next(error);
  }
};

export const replaceLastSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {    
    checkRequestApiKey(req);
    
    const data: GeolocationPosition = req.body;
    const entry = getSleepEntryFromGeolocationPosition(data);

    const valuesToAppend = [ Object.values(entry) ];

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });
    
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

    successResponse(res, response, "Successfully replaced last sleep entry")
  } catch (error) {
    next(error);
  }
};

export const deleteSecondLastSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {    
    checkRequestApiKey(req);
    
    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });

    const rows = await getArray(
      sheetsObj,
      process.env.SPREADSHEET_ID!,
      process.env.SPREADSHEET_RANGE!,
    ).catch((error: Error) => {
      throw new ApiError('Failed to retrieve rows', error);
    });

    const rowToDelete = rows.length - 1;
    const result = await deleteRow(sheetsObj, process.env.SPREADSHEET_ID!, 0, rowToDelete);

    const response = {
      deletedRow: {
        'Timezone local time': rows[rowToDelete - 1][0],
        'Latitude': rows[rowToDelete - 1][1],
        'Longitude': rows[rowToDelete - 1][2],
        'Timezone': rows[rowToDelete - 1][3],
        'UTC time': rows[rowToDelete - 1][4],
        'Duration': rows[rowToDelete - 1][5]
      } as SheetsSleepEntry
    }

    await sendDeleteNotification(response.deletedRow);

    successResponse(res, response, "Successfully deleted second to last sleep entry")
  } catch (error) {
    next(error);
  }
};

const getSleepEntryFromGeolocationPosition = (geolocationPosition: GeolocationPosition): SleepEntry => {
  const timezoneName = getTimezoneFromCoords(geolocationPosition.coords.latitude, geolocationPosition.coords.longitude);

  const utcTime = moment.utc(geolocationPosition.timestamp);
  const localTime = utcTime.clone().tz(timezoneName);

  const entry: SleepEntry = {
    localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
    latitude: String(geolocationPosition.coords.latitude),
    longitude: String(geolocationPosition.coords.longitude),
    timezone: timezoneName,
    utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
    durationString: `=IF(ISODD(ROW()),INDIRECT(ADDRESS(ROW(),COLUMN()-1,4))-INDIRECT(ADDRESS(ROW()-1,COLUMN()-1,4)),"")`
  };

  return entry;
}

type Notification = {
  title: string,
  body: string
}

const sendNotification = async (notification: Notification) => {
  const pusher = new PushBullet(process.env.PUSHBULLET_API_KEY);
  await pusher
    .note(process.env.PUSHBULLET_EMAIL, notification.title, notification.body)
    .catch((error: Error) => { throw new ApiError('Failed to send notification', error) });
}

const sendEntryNotification = async (entry: SheetsSleepEntry) => {
  const notification = getEntryNotificationText(entry);
  await sendNotification(notification);
}

const sendDeleteNotification = async (entry: SheetsSleepEntry) => {
  const notification = getDeleteNotificationText(entry);
  await sendNotification(notification);
}

const getEntryNotificationText = (entry: SheetsSleepEntry): Notification => {
  const isStop = !!entry['Duration'];
  return {
    title: isStop ? '⏹️ Sleep stop logged' : '▶️ Sleep start logged',
    body: getShortSleepEntryDescription(entry)
  }
}

const getDeleteNotificationText = (entry: SheetsSleepEntry): Notification => ({
  title: '🗑️ Sleep deleted',
  body: getShortSleepEntryDescription(entry)
})

const getShortSleepEntryDescription = (entry: SheetsSleepEntry) => {
  const isStop = !!entry['Duration'];
  return isStop
    ? `${entry['Timezone local time']} at ${entry['Timezone']}\nDuration: ${entry['Duration']}`
    : `${entry['Timezone local time']} at ${entry['Timezone']}`
}

const getTimezoneFromCoords = (lat: number, lng: number): string => geoTz.find(lat, lng)[0];

const checkRequestApiKey = (req: Request) => {
  const apiKey = req.query.apiKey;
  if (apiKey != process.env.API_KEY) {
    throw new ApiError('Invalid API key');
  }
}

const getLastRowRange = (rows: any[]) => {
  const A_CHAR_CODE = "A".charCodeAt(0)
  const Z_CHAR_CODE = "Z".charCodeAt(0)

  const lastColumnCharNumber = A_CHAR_CODE + (rows[0].length - 1);
  // Limit in case there's columns in AA+ territory
  const limitedColumnCharNumber = lastColumnCharNumber > Z_CHAR_CODE ? Z_CHAR_CODE : lastColumnCharNumber
  const lastColumn = String.fromCharCode(limitedColumnCharNumber);
  const lastRowRange = `A${rows.length}:${lastColumn}`;
  return lastRowRange;
}
