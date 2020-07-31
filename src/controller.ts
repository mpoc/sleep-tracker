import { Request, Response, NextFunction } from "express";
import moment from 'moment-timezone';
//@ts-ignore
import geoTz from 'geo-tz';
//@ts-ignore
import PushBullet from 'pushbullet';

import {
  getSheetsObj,
  getObjectArrayHeader,
  getArray,
  append,
  GoogleSheetsAppendUpdates,
  update
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
    const data: GeolocationPosition = req.body;
    const apiKey = req.query.apiKey;

    if (apiKey != process.env.API_KEY) {
      throw new ApiError('Invalid API key');
    }

    const timezoneName = getTimezoneFromCoords(data.coords.latitude, data.coords.longitude);

    const utcTime = moment.utc(data.timestamp);
    const localTime = utcTime.clone().tz(timezoneName);

    const entry: SleepEntry = {
      localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneName,
      utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
      durationString: `=IF(ISODD(ROW()),INDIRECT(ADDRESS(ROW(),COLUMN()-1,4))-INDIRECT(ADDRESS(ROW()-1,COLUMN()-1,4)),"")`
    };

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

    await sendNotification(response.updatedRow);

    successResponse(res, response, "Successfully logged sleep")
  } catch (error) {
    next(error);
  }
};

export const replaceLastSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: GeolocationPosition = req.body;
    const apiKey = req.query.apiKey;

    if (apiKey != process.env.API_KEY) {
      throw new ApiError('Invalid API key');
    }

    const timezoneName = getTimezoneFromCoords(data.coords.latitude, data.coords.longitude);

    const utcTime = moment.utc(data.timestamp);
    const localTime = utcTime.clone().tz(timezoneName);

    const entry: SleepEntry = {
      localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneName,
      utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
      durationString: `=IF(ISODD(ROW()),INDIRECT(ADDRESS(ROW(),COLUMN()-1,4))-INDIRECT(ADDRESS(ROW()-1,COLUMN()-1,4)),"")`
    };

    const valuesToAppend = [ Object.values(entry) ];

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });
    
    const rows = await getArray(
      sheetsObj,
      process.env.SPREADSHEET_ID!,
      process.env.SPREADSHEET_RANGE!,
    ).catch((error: Error) => {
      throw new ApiError('Failed to retrieve row after writing', error);
    });

    const lastColumnCharNumber = 64 + rows[0].length;
    // Limit in case there's columns in AA+ territory
    const limitedColumnCharNumber = lastColumnCharNumber > 90 ? 90 : lastColumnCharNumber
    const lastColumn = String.fromCharCode(limitedColumnCharNumber);
    const rangeToUpdate = `A${rows.length}:${lastColumn}`;

    const result: GoogleSheetsAppendUpdates = await update(
      sheetsObj,
      process.env.SPREADSHEET_ID!,
      rangeToUpdate,
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

    await sendNotification(response.updatedRow);

    successResponse(res, response, "Successfully logged sleep")
  } catch (error) {
    next(error);
  }
};

const sendNotification = async (row: SheetsSleepEntry) => {
  const notification = getNotificationText(row);
  const pusher = new PushBullet(process.env.PUSHBULLET_API_KEY);
  await pusher
    .note(process.env.PUSHBULLET_EMAIL, notification.title, notification.body)
    .catch((error: Error) => { throw new ApiError('Failed to send notification', error) });
}

const getNotificationText = (row: SheetsSleepEntry): { title: string, body: string } => {
  const isStop = !!row['Duration'];
  if (isStop) {
    return {
      title: '⏹️ Sleep stop logged',
      body: `${row['Timezone local time']} at ${row['Timezone']}\nDuration: ${row['Duration']}`
    }
  } else {
    return {
      title: '▶️ Sleep start logged',
      body: `${row['Timezone local time']} at ${row['Timezone']}`
    }
  }
}

const getTimezoneFromCoords = (lat: number, lng: number): string => geoTz(lat, lng)[0];
