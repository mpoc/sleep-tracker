import assert from "node:assert/strict";
import fs from "node:fs";
import readline from "node:readline";
import { OAuth2Client } from "google-auth-library";
import type { sheets_v4 } from "googleapis";
// https://github.com/googleapis/google-api-nodejs-client/issues/2187
import { sheets } from "googleapis/build/src/apis/sheets";
import { ApiError } from "./error";
import { SheetsLastRowResponse, SheetsRowCountResponse } from "./types";

const CRED_PATH = "secret/credentials.json";
const TOKEN_PATH = "secret/token.json";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const getSheetsObj = async () => {
  try {
    const cred = JSON.parse(fs.readFileSync(CRED_PATH, "utf8"));
    const auth = await authorize(cred);
    return sheets({ version: "v4", auth });
  } catch (error) {
    throw new ApiError("Failed to login to Google", error);
  }
};

export const getArray = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
) => {
  const response = await sheetsObj.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  assert(response.data.values);
  return response.data.values;
};

export const getObjectArray = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<any[]> =>
  toObjectArray(await getArray(sheetsObj, spreadsheetId, range));

export const getObjectArrayHeader = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<any[]> => {
  const headerArray = getArray(sheetsObj, spreadsheetId, "1:1");
  const dataArray = getArray(sheetsObj, spreadsheetId, range);
  return toObjectArray(await dataArray, (await headerArray)[0]);
};

export const getLastRow = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range = "lastRow!A:Z"
) => {
  const lastRowResult = await getObjectArray(sheetsObj, spreadsheetId, range);
  const lastRow = SheetsLastRowResponse.parse(lastRowResult).at(0);
  assert(lastRow);
  return lastRow;
};

export const getRowCount = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range = "rowCount!A:A"
) => {
  const rowCountResult = await getObjectArray(sheetsObj, spreadsheetId, range);
  const rowCount = SheetsRowCountResponse.parse(rowCountResult).at(0);
  assert(rowCount);
  return rowCount.rowCount;
};

export const append = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: string[][]
) => {
  const response = await sheetsObj.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return response.data.updates;
};

export const update = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: string[][]
) => {
  const response = await sheetsObj.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
  return response.data;
};

export const deleteRows = async ({
  sheetsObj,
  spreadsheetId,
  sheetId,
  startIndex,
  endIndex,
}: {
  sheetsObj: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetId: number;
  startIndex: number;
  endIndex: number;
}) => {
  const response = await sheetsObj.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });
  return response.data;
};

export const deleteRow = async (
  sheetsObj: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
) =>
  deleteRows({
    sheetsObj,
    spreadsheetId,
    sheetId,
    startIndex: rowIndex - 1,
    endIndex: rowIndex,
  });

const toObjectArray = (array: any[][], header?: any[]): any[] => {
  if (!header) {
    return toObjectArray(array, array.splice(0, 1)[0]);
  }
  const output = [] as any[];

  for (const el of array) {
    const entry = {} as any;
    header.forEach((h, i) => {
      entry[h] = el[i] ? el[i] : undefined;
    });
    output.push(entry);
  }

  return output;
};

const authorize = async (cred: any): Promise<OAuth2Client> => {
  const { client_secret, client_id, redirect_uris } = cred.installed;
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch {
    return await getNewToken(oAuth2Client);
  }
};

const getNewToken = async (
  oAuth2Client: OAuth2Client
): Promise<OAuth2Client> => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this url: ", authUrl);

  return (await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Enter the code from that page here: ", (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        reject(err);
        if (!token) {
          reject();
        }
        oAuth2Client.setCredentials(token!);

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));

        resolve(oAuth2Client);
      });
    });
  })) as OAuth2Client;
};
