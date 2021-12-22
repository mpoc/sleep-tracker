import fs from 'fs';
import readline from 'readline';
// https://github.com/googleapis/google-api-nodejs-client/issues/2187
import { sheets } from 'googleapis/build/src/apis/sheets';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from './error';

const CRED_PATH = 'secret/credentials.json';
const TOKEN_PATH = 'secret/token.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const getSheetsObj = async () => {
  try { 
    const cred = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
    const auth = await authorize(cred);
    return sheets({version: 'v4', auth});
  } catch (error) {
    throw new ApiError("Failed to login to Google", error);
  }
}

export const getArray = async (
  sheetsObj: any,
  spreadsheetId: string,
  range: string
): Promise<any[][]> => await new Promise((resolve, reject) => {
    sheetsObj.spreadsheets.values.get(
      {spreadsheetId, range},
      (err: any, res: any) => (err ? reject(err) : resolve(res.data.values))
    );
  }) as any[][];

export const getObjectArray = async (
  sheetsObj: any,
  spreadsheetId: string,
  range: string
): Promise<any[]> => toObjectArray(await getArray(sheetsObj, spreadsheetId, range));

export const getObjectArrayHeader = async (
  sheetsObj: any,
  spreadsheetId: string,
  range: string
): Promise<any[]> => toObjectArray(
  await getArray(sheetsObj, spreadsheetId, range),
  (await getArray(sheetsObj, spreadsheetId, '1:1'))[0]
);

export type GoogleSheetsAppendUpdates = {
  spreadsheetId: string,
  updatedRange: string,
  updatedRows: number,
  updatedColumns: number,
  updatedCells: number
}

export const append = async (
  sheetsObj: any,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<any> => {
  return await new Promise((resolve, reject) => {
    sheetsObj.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      }
    },
    (err: any, res: any) => (err ? reject(err) : resolve(res.data.updates))
    );
  });
}

export const update = async (
  sheetsObj: any,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<any> => {
  return await new Promise((resolve, reject) => {
    sheetsObj.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      }
    },
    (err: any, res: any) => (err ? reject(err) : resolve(res.data))
    );
  });
}

export const deleteRows = async (
  sheetsObj: any,
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  endIndex: number
): Promise<any> => {
  return await new Promise((resolve, reject) => {
    sheetsObj.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex
              }
            }
          }
        ]
      }
    },
    (err: any, res: any) => (err ? reject(err) : resolve(res.data))
    );
  });
}

export const deleteRow = async (
  sheetsObj: any,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
): Promise<any> => deleteRows(sheetsObj, spreadsheetId, sheetId, rowIndex - 1, rowIndex);

const toObjectArray = (array: any[][], header?: any[]): any[] => {
  if (!header) {
    return toObjectArray(array, array.splice(0, 1)[0]);
  }
  const output = [] as any[];

  array.forEach(el => {
    const entry = {} as any;
    header.forEach((h, i) => {
      entry[h] = el[i] ? el[i] : undefined;
    });
    output.push(entry);
  });

  return output;
}

const authorize = async (cred: any): Promise<OAuth2Client> => {
  const {client_secret, client_id, redirect_uris} = cred.installed;
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (e) {
    return await getNewToken(oAuth2Client);
  }
}

const getNewToken = async (oAuth2Client: OAuth2Client): Promise<OAuth2Client> => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url: ', authUrl);

  return (await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', code => {
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
}
