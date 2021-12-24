import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv-safe';
import path from 'path';
import { logSleepRoute, replaceLastSleepRoute, deleteSecondLastSleepRoute, getSleepRoute, getLastSleepRoute, getLastSleep, sendReminderNotification } from './controller';
import { handleError } from './error';
import { millisecondsSinceSleepEntry, millisecondsToHours, minutesToMilliseconds } from './utils';

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

const HOURS_BEFORE_REMINDER = 15;
const REMINDER_CHECK_INTERVAL_MINUTES = 5;

const getMsSinceLastSleepLog = async () => {
  const lastSleepData = await getLastSleep();
  const msDiff = millisecondsSinceSleepEntry(lastSleepData.lastSleepEntry);
  return msDiff;
};

let notificationSent = false;

const checkReminderNotification = async () => {
  const msDiff = await getMsSinceLastSleepLog();
  const hoursDiff = millisecondsToHours(msDiff);

  if (hoursDiff > HOURS_BEFORE_REMINDER) {
    if (!notificationSent) {
      console.log(`${new Date().toISOString()}: Sending reminder notification`)
      notificationSent = true;
      await sendReminderNotification(msDiff);
    }
  } else {
    notificationSent = false;
  }
};

const checkReminderLoop = () => {
  checkReminderNotification();
  setTimeout(checkReminderLoop, minutesToMilliseconds(REMINDER_CHECK_INTERVAL_MINUTES));
};
