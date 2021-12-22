# Sleep Tracker

A simple progressive web app to track sleep.

<p align="center">
    <img src="images/sleep-tracker.png" alt="An example of a sleep logged during 22nd of December" width="250">
</p>

## Specifying secrets

Secrets have to be set up before running the project.

Environment variables for `secret/.env` file:

1. `API_KEY` - API key that client will have to provide in order to be able to access the sleep tracker webpage
1. `SPREADSHEET_ID` - Google Sheets spreadsheet ID, e.g. the ID for a spreadsheet with the link https://docs.google.com/spreadsheets/d/13Nig7emkfeSDraasAERmsc82k2i3y4Csdfcazj0kUPcUY/ would be `13Nig7emkfeSDraasAERmsc82k2i3y4Csdfcazj0kUPcUY`
1. `SPREADSHEET_RANGE` - The name of the Google Sheets spreadsheet, e.g. `Sheet1`
1. `PUSHBULLET_API_KEY` - PushBullet API key to send a notification after creating/deleting a sleep entry
1. `PUSHBULLET_EMAIL` - Email address for the PushBullet notification

Google Sheets API OAuth client credentials for `secret/credentials.json` file also have to be generated at https://console.cloud.google.com/apis/api/sheets.googleapis.com/credentials

During first login there will be a command line prompt to log in with Google.
After logging in, a `secret/token.json` file will be generated and the app will have to be restarted in order for it to work.

## How to run

### Running locally

```shell
yarn install
yarn compile
yarn start
```

### Running using Docker

```shell
docker-compose up -d
```

## How to log sleep

Go to http://localhost:8000/sleep?apiKey=FDePZR0CKULDeWf6eX6DqpG2EfcSPvj3BB84VjIFnorkPtY2AUGEW9aH to see the app.
Note that in order to log the sleep entry location, it will have run over HTTPS.
Without HTTPS, this error will happen when trying to access the location:

```text
ERROR(1): Only secure origins are allowed (see: https://goo.gl/Y0ZkNV).
```