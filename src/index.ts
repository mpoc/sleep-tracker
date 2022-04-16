import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv-safe';
import path from 'path';

import { logSleepRoute, replaceLastSleepRoute, deleteSecondLastSleepRoute, getSleepRoute, getLastSleepRoute, getLastSleep } from './controller';
import { sendReminderNotification } from './notifications';
import { handleError } from './error';
import { millisecondsSinceSleepEntry, millisecondsToHours, minutesToMilliseconds, sheetsSleepEntryIsStop } from './utils';

dotenv.config({
  path: path.resolve(__dirname, '..', 'secret/.env'),
  example: path.resolve(__dirname, '..', 'secret/.env.example'),
});

const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/js', express.static(__dirname + '/views/js'));
app.use(express.static(__dirname + '/static'))

app.post('/api/sleep', logSleepRoute);
app.put('/api/sleep/replace', replaceLastSleepRoute);
app.delete('/api/sleep/deleteSecondLast', deleteSecondLastSleepRoute);
app.get('/api/sleep', getSleepRoute);
app.get('/api/sleep/last', getLastSleepRoute);

app.get('/', async (req, res) => res.render('sleep.pug'));
app.get('/sleep', async (req, res) => res.render('sleep.pug'));

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  handleError(res, error);
});

const PORT = '8000';
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  checkReminderLoop();
});

const HOURS_BEFORE_START_REMINDER = 15.5;
const HOURS_BEFORE_STOP_REMINDER = 8.5;
const REMINDER_CHECK_INTERVAL_MINUTES = 5;

let reminderNotificationSent = false;

const checkReminderNotification = async () => {
  const lastSleepData = await getLastSleep();

  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(lastSleepData.lastSleepEntry);

  const msDiff = millisecondsSinceSleepEntry(lastSleepData.lastSleepEntry);
  const hoursDiff = millisecondsToHours(msDiff);

  const hoursBeforeReminder = lastSleepEntryIsStop ? HOURS_BEFORE_START_REMINDER : HOURS_BEFORE_STOP_REMINDER;

  // console.log(`${new Date().toISOString()}: Checking ${lastSleepEntryIsStop ? 'start' : 'stop'} reminder notification ${hoursDiff} (${hoursBeforeReminder})`)
  if (hoursDiff > hoursBeforeReminder) {
    if (!reminderNotificationSent) {
      console.log(`${new Date().toISOString()}: Sending ${lastSleepEntryIsStop ? 'start' : 'stop'} reminder notification`)
      reminderNotificationSent = true;
      await sendReminderNotification(msDiff, lastSleepEntryIsStop);
    }
  } else {
    reminderNotificationSent = false;
  }
};

const checkReminderLoop = () => {
  checkReminderNotification();
  setTimeout(checkReminderLoop, minutesToMilliseconds(REMINDER_CHECK_INTERVAL_MINUTES));
};
