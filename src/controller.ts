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

export const logSleep = async (req: Request, res: Response) => {
  try {
    const data: GeolocationPosition = req.body;
    
    const timezoneName = await getTimezoneFromCoords(data.coords.latitude, data.coords.longitude);

    const utcTime = moment.utc(data.timestamp);
    const localTime = utcTime.clone().tz(timezoneName);
    console.log({utcTime, localTime});
    const entry: SleepEntry = {
      localTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneName,
      utcTime: utcTime.format('YYYY-MM-DD HH:mm:ss'),
    };

    const values = [ Object.values(entry) ];

    const SPREADSHEET_ID = '';
    const RANGE = 'Sheet1';

    const result = await append(await getSheetsObj(), SPREADSHEET_ID, RANGE, values);
    console.log(result);

    res.json({
      success: true,
      data: result
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
  const TIMEZONEDB_API_KEY = '';
  const url = `http://api.timezonedb.com?key=${TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
  try {
    const response: AxiosResponse<TimezoneDBResponse> = await axios.get(url);
    if (response.data.status == "OK") {
      return response.data.zoneName;
    } else {
      return "";
    }
  } catch (error) {
    console.error(error);
    return "";
  }
};
