export type GeolocationPosition = {
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

export type SleepEntry = {
  utcTime: string,
  localTime: string,
  latitude: string,
  longitude: string,
  timezone: string,
  durationString: string
}

export type SheetsSleepEntry = {
  'Timezone local time': string,
  'Latitude': string,
  'Longitude': string,
  'Timezone': string,
  'UTC time': string,
  'Duration': string
}

export type Notification = {
  title: string,
  body: string
}

export type GoogleSheetsAppendUpdates = {
  spreadsheetId: string,
  updatedRange: string,
  updatedRows: number,
  updatedColumns: number,
  updatedCells: number
}

export type ApiResponse = {
  success: boolean,
  data?: object,
  message?: string
}
