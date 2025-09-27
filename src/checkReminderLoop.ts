import { getLastSleep } from "./controller";
import { sendReminderNotification } from "./notifications";
import { millisecondsSinceSleepEntry, millisecondsToHours, minutesToMilliseconds, sheetsSleepEntryIsStop } from "./utils";

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

export const checkReminderLoop = () => {
  checkReminderNotification();
  setTimeout(checkReminderLoop, minutesToMilliseconds(REMINDER_CHECK_INTERVAL_MINUTES));
};
