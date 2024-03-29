//@ts-ignore
import PushBullet from 'pushbullet';

import { Notification, SheetsSleepEntry } from './types';
import { millisecondsToHours, sheetsSleepEntryIsStop } from "./utils";
import { ApiError } from './error';

const sendNotification = async (notification: Notification) => {
  const pusher = new PushBullet(process.env.PUSHBULLET_API_KEY);
  await pusher
    .note({}, notification.title, notification.body)
    .catch((error: Error) => { throw new ApiError('Failed to send notification', error) });
};

export const sendEntryNotification = async (entry: SheetsSleepEntry) => {
  const notification = getEntryNotificationText(entry);
  await sendNotification(notification);
};

export const sendDeleteNotification = async (entry: SheetsSleepEntry) => {
  const notification = getDeleteNotificationText(entry);
  await sendNotification(notification);
};

export const sendReminderNotification = async (msSinceLastSleepEntry: number, lastEntryIsStop: boolean) => {
  const notification = getReminderNotificationText(msSinceLastSleepEntry, lastEntryIsStop);
  await sendNotification(notification);
};

const getEntryNotificationText = (entry: SheetsSleepEntry): Notification => {
  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(entry);
  return {
    title: lastSleepEntryIsStop ? '🌅 Sleep stop logged' : '🌃 Sleep start logged',
    body: getShortSleepEntryDescription(entry)
  }
};

const getDeleteNotificationText = (entry: SheetsSleepEntry): Notification => ({
  title: '🗑️ Sleep deleted',
  body: getShortSleepEntryDescription(entry)
});

const getReminderNotificationText = (msSinceLastSleepEntry: number, lastEntryIsStop: boolean): Notification => {
  const roundFloat = (num: number) => Math.round(num * 10) / 10
  const hours = millisecondsToHours(msSinceLastSleepEntry);
  return {
    title: lastEntryIsStop ? '🥱 Time to go to sleep' : '⏰ Time to wake up',
    body: `It has been ${roundFloat(hours)} hours since you ${lastEntryIsStop ? 'woke up' : 'fell asleep'}`,
  }
};

const getShortSleepEntryDescription = (entry: SheetsSleepEntry) => {
  const lastSleepEntryIsStop = sheetsSleepEntryIsStop(entry);
  return lastSleepEntryIsStop
    ? `${entry['Timezone local time']} at ${entry['Timezone']}\nDuration: ${entry['Duration']}`
    : `${entry['Timezone local time']} at ${entry['Timezone']}`
};
