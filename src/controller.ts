import { Request, Response, NextFunction } from "express";
import moment from 'moment-timezone';
//@ts-ignore
import geoTz from 'geo-tz';
//@ts-ignore
import PushBullet from 'pushbullet';

import { getSheetsObj, getObjectArrayHeader, getArray, append, GoogleSheetsAppendUpdates } from './sheets';
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
  timezone: string
}

export const logSleep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: GeolocationPosition = req.body;
    const apiKey = req.query.apiKey;

    if (!process.env.API_KEY) {
      throw new ApiError('No API key provided in environment');
    }

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
      durationString: `=IF(ISODD(ROW()),READABLE_DURATION(INDIRECT(ADDRESS(ROW()-1,COLUMN()-1,4)),INDIRECT(ADDRESS(ROW(),COLUMN()-1,4))),"")`
    };

    const valuesToAppend = [ Object.values(entry) ];

    if (!process.env.SPREADSHEET_ID) {
      throw new ApiError("Spreadsheet ID not defined");
    }
    if (!process.env.RANGE) {
      throw new ApiError('Range not defined');
    }

    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });
    
    const result: GoogleSheetsAppendUpdates = await append(
      sheetsObj,
      process.env.SPREADSHEET_ID,
      process.env.RANGE,
      valuesToAppend
    ).catch(error => {
      throw new ApiError("Failed to append rows to Google Sheet", error);
    });

    const updatedRows = await getObjectArrayHeader(
      sheetsObj,
      process.env.SPREADSHEET_ID,
      result.updatedRange
    ).catch(error => {
      throw new ApiError('Failed to retrieve row after writing', error);
    });

    const response = {
      updatedRow: updatedRows[0]
    }

    if (!process.env.PUSHBULLET_API_KEY) {
      throw new ApiError('PushBullet API key not defined');
    }
    const pusher = new PushBullet(process.env.PUSHBULLET_API_KEY);

    const notificationBody = Object.entries(response.updatedRow).map(([key, value]) => `${key}: ${value}`).join(",\n");
    await pusher
      .note(process.env.PUSHBULLET_EMAIL, 'Sleep logged', notificationBody)
      .catch((error: Error) => { throw new ApiError('Failed to send notification', error) });

    successResponse(res, response, "Successfully logged sleep")
  } catch (error) {
    next(error);
  }
}

const getTimezoneFromCoords = (lat: number, lng: number): string => geoTz(lat, lng)[0];
