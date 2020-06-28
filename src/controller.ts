import { Request, Response } from "express";
import moment from 'moment';
import axios from 'axios';
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
    
    const timezoneData: TimezoneDBResponse = await getTimezoneFromCoords(data.coords.latitude, data.coords.longitude);

    const time = moment(data.timestamp).utc();
    const entry: SleepEntry = {
      utcTime: time.format('YYYY-MM-DD HH:mm:ss'),
      localTime: time
        .utcOffset(timezoneData.gmtOffsetMinutes)
        .format('YYYY-MM-DD HH:mm:ss'),
      latitude: String(data.coords.latitude),
      longitude: String(data.coords.longitude),
      timezone: timezoneData.zoneName,
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
  gmtOffsetMinutes: number
}

const getTimezoneFromCoords = async (lat: number, lng: number) => {
  const TIMEZONEDB_API_KEY = '';
  const url = `http://api.timezonedb.com?key=${TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
  try {
    const response = await axios.get(url);
    const data: TimezoneDBResponse = response.data;
    data.gmtOffsetMinutes = Number(data.gmtOffset) / 60;
    return data;
  } catch (error) {
    console.error(error);
    return {} as TimezoneDBResponse;
  }
};
