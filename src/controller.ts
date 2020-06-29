import { Request, Response } from "express";
import moment from 'moment-timezone';
import axios, { AxiosResponse } from 'axios';
import { getSheetsObj, getObjectArray, getArray, append } from './sheets';

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

type GoogleSheetsAppendUpdates = {
  spreadsheetId: string,
  updatedRange: string,
  updatedRows: number,
  updatedColumns: number,
  updatedCells: number
}

export const logSleep = async (req: Request, res: Response) => {
  try {
    const data: GeolocationPosition = req.body;

    console.time('Get timezone name');
    const timezoneName = await getTimezoneFromCoords(data.coords.latitude, data.coords.longitude);
    console.timeEnd('Get timezone name');

    const utcTime = moment.utc(data.timestamp);
    const localTime = utcTime.clone().tz(timezoneName);
    const entry: SleepEntry = {
      localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneName,
      utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
    };

    const values = [ Object.values(entry) ];

    if (!process.env.SPREADSHEET_ID) {
      throw Error("Spreadsheet ID not defined");
    }
    const RANGE = 'Sheet1';

    console.time('Write to Google Sheets');
    const sheetsObj = await getSheetsObj();
    const result: GoogleSheetsAppendUpdates = await append(
      sheetsObj,
      process.env.SPREADSHEET_ID,
      RANGE,
      values
    );
    console.timeEnd('Write to Google Sheets');

    console.time('Read from Google Sheets');
    const updatedRows = await getArray(sheetsObj, process.env.SPREADSHEET_ID, result.updatedRange);
    console.timeEnd('Read from Google Sheets');

    console.log({ updatedRows });

    res.json({
      success: true,
      data: {
        updatedRow: updatedRows[0]
      }
    });
  } catch (error) {
    console.log(error);
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
    throw Error('TimezoneDB API key not defined');
  }
  const url = `http://api.timezonedb.com?key=${process.env.TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
  try {
    const response: AxiosResponse<TimezoneDBResponse> = await axios.get(url);
    if (response.data.status == "OK") {
      return response.data.zoneName;
    } else {
      console.log(response.data);
      return "";
    }
  } catch (error) {
    console.error(error);
    return "";
  }
};
