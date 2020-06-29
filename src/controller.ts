import { Request, Response, NextFunction } from "express";
import moment from 'moment-timezone';
import axios, { AxiosResponse } from 'axios';
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

    if (apiKey != process.env.API_KEY) {
      throw new ApiError('Invalid API key');
    }

    // console.time('Get timezone name');
    const timezoneName =
      await getTimezoneFromCoords(data.coords.latitude, data.coords.longitude)
        .catch(error => {
          throw new ApiError("Failed to retrieve timezone from TimezoneDB", error);
        });
    // console.timeEnd('Get timezone name');

    const utcTime = moment.utc(data.timestamp);
    const localTime = utcTime.clone().tz(timezoneName);

    const entry: SleepEntry = {
      localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneName,
      utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
    };

    const valuesToAppend = [ Object.values(entry) ];

    if (!process.env.SPREADSHEET_ID) {
      throw new ApiError("Spreadsheet ID not defined");
    }
    if (!process.env.RANGE) {
      throw new ApiError('Range not defined');
    }

    // console.time('Get sheetsObj');
    const sheetsObj = await getSheetsObj().catch(error => {
      throw new ApiError("Failed to login to Google", error);
    });
    // console.timeEnd('Get sheetsObj');
    
    // console.time('Write to Google Sheets');
    const result: GoogleSheetsAppendUpdates = await append(
      sheetsObj,
      process.env.SPREADSHEET_ID,
      process.env.RANGE,
      valuesToAppend
    ).catch(error => {
      throw new ApiError("Failed to append rows to Google Sheet", error);
    });
    // console.timeEnd('Write to Google Sheets');

    // console.time('Read from Google Sheets');
    const updatedRows = await getObjectArrayHeader(
      sheetsObj,
      process.env.SPREADSHEET_ID,
      result.updatedRange
    ).catch(error => {
      throw new ApiError('Failed to retrieve row after writing', error);
    });
    // console.timeEnd('Read from Google Sheets');

    const response = {
      updatedRow: updatedRows[0]
    }

    successResponse(res, response, "Successfully logged sleep")
  } catch (error) {
    next(error);
  }
};

type TimezoneDBResponse = {
  status: string,
  message: string,
  countryCode: string,
  zoneName: string,
  abbreviation: string,
  gmtOffset: string,
  dst: string,
  timestamp: number
}

const getTimezoneFromCoords = async (lat: number, lng: number): Promise<string> => {
  if (!process.env.TIMEZONEDB_API_KEY) {
    throw new ApiError('TimezoneDB API key not defined');
  }
  const url = `http://api.timezonedb.com?key=${process.env.TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
  try {
    const response: AxiosResponse<TimezoneDBResponse> = await axios.get(url);
    if (response.data.status == "OK") {
      return response.data.zoneName;
    } else {
      throw new ApiError('Error receiving data from TimezoneDB API', response.data);
    }
  } catch (error) {
    throw new ApiError('Error calling TimezoneDB API', error);
  }
};
