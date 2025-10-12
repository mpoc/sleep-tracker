import ms from "ms";
import { getLastSleep } from "./controller";
import { sendReminderNotification } from "./notifications";
import { millisecondsSinceSleepEntry, sheetsSleepEntryIsStop } from "./utils";

const TIME_BEFORE_START_REMINDER = "15.5 hours";
const TIME_BEFORE_STOP_REMINDER = "8.5 hours";
const REMINDER_CHECK_INTERVAL = "5 minutes";

let reminderNotificationSent = false;

const checkReminderNotification = async () => {
  const lastSleepData = await getLastSleep();

  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(
    lastSleepData.lastSleepEntry
  );

  const msDiff = millisecondsSinceSleepEntry(lastSleepData.lastSleepEntry);

  const timeBeforeReminder = lastSleepEntryIsStop
    ? TIME_BEFORE_START_REMINDER
    : TIME_BEFORE_STOP_REMINDER;

  if (msDiff > ms(timeBeforeReminder)) {
    if (!reminderNotificationSent) {
      console.log(
        `${new Date().toISOString()}: Sending ${lastSleepEntryIsStop ? "start" : "stop"} reminder notification`
      );
      reminderNotificationSent = true;
      await sendReminderNotification(msDiff, lastSleepEntryIsStop);
    }
  } else {
    reminderNotificationSent = false;
  }
};

export const checkReminderLoop = () => {
  checkReminderNotification();
  setTimeout(checkReminderLoop, ms(REMINDER_CHECK_INTERVAL));
};
