import {
  formatDuration,
  prettyObjectString,
  printPosition
} from './utils.js';
import {
  getSleepEntries,
  submitSleepEntry,
  replaceLastSleepEntry
} from './api.js'

const processSleepApiResponse = data => {
  if (data.success) {
    const insertedRowText = prettyObjectString(data.data.updatedRow);

    document.getElementById('text').innerHTML = `Inserted row:<br>${insertedRowText}`;
  } else {
    console.error(data);
    document.getElementById('text').innerHTML = data.message;
  }
}

const processReplaceApiResponse = data => {
  if (data.success) {
    const insertedRowText = prettyObjectString(data.data.updatedRow);
    document.getElementById('text').innerHTML = `Replaced row:<br>${insertedRowText}`;
  } else {
    console.error(data);
    document.getElementById('text').innerHTML = data.message;
  }
}

const REQUIRED_ACCURACY = 25;
let watchID;

const submitPosition = (curriedSuccessFn) => {
  if (!geolocationAvailable()) return;

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };
  
  watchID = navigator.geolocation.watchPosition(curriedSuccessFn, watchError, options);
}

const onWatchSuccess = (successFn) =>
  async (position) => {
    printPosition(position);

    if (!checkTimestamp(position)) return;
    if (!checkAccuracy(position)) return;

    document.getElementById('text').innerHTML = "Accuracy and timestamp OK, saving...";
    navigator.geolocation.clearWatch(watchID);

    await successFn(position);
}

const watchError = err => {
  const errorText = `ERROR(${err.code}): ${err.message}`;
  console.log(errorText);
  document.getElementById('text').innerHTML = errorText;
};

const submitAndProcessSleepEntry = async (position) => {
  const response = await submitSleepEntry(position);
  processSleepApiResponse(response);
}

const submitAndProcessSleepEntryReplace = async (position) => {
  const response = await replaceLastSleepEntry(position);
  processReplaceApiResponse(response);
}

const checkTimestamp = position => {
  const ALLOWED_TIMESTAMP_AGE = 2000;
  const timestampAge = Date.now() - position.timestamp;
  const timestampRecent = timestampAge < ALLOWED_TIMESTAMP_AGE;
  if (!timestampRecent) {
    document.getElementById('text').innerHTML = `Timestamp too old (${timestampAge} milliseconds)<br>Trying again...`;
  }
  return timestampRecent;
}

const checkAccuracy = position => {
  const accuracyAchieved = position.coords.accuracy < REQUIRED_ACCURACY;
  if (!accuracyAchieved) {
    document.getElementById('text').innerHTML =
      `Current accuracy: ${position.coords.accuracy} meters<br>Required accuracy: ${REQUIRED_ACCURACY} meters<br>Trying again...`;
  }
  return accuracyAchieved;
}

const geolocationAvailable = () => {
  if (navigator.geolocation) {
    return true;
  } else {
    console.log('Geolocation is not supported by this browser.');
    document.getElementById('text').innerHTML = 'Geolocation is not supported by this browser.';
    return false;
  }
}

let entryDisplayInterval;

const showSleepEntry = (entry) => {
  document.getElementById("logSleepButton").disabled = false;
  const isStop = !!entry['Duration'];
  if (!isStop) {
    document.getElementById("replaceLastSleepButton").disabled = false;
  }
  startEntryDisplay(entry);
}

const updateEntryDisplay = entry => {
  const [ date, time ] = entry['UTC time'].split(" ");
  const formattedUTCDate = date + "T" + time + "Z";

  const timeDiff = new Date() - new Date(formattedUTCDate);
  
  document.getElementById('text').innerHTML =
    `Last sleep entry:<br><br>${prettyObjectString(entry)}<br><br>${formatDuration(timeDiff)} ago.`;
}

const startEntryDisplay = (entry) => {
  // Initial start
  updateEntryDisplay(entry);

  // Loop
  clearInterval(entryDisplayInterval);
  entryDisplayInterval = setInterval(() => updateEntryDisplay(entry), 1000);
}

const enableButtons = () => {
  document.getElementById("logSleepButton").disabled = false;
  document.getElementById("replaceLastSleepButton").disabled = false;
}

const disableButtons = () => {
  document.getElementById("logSleepButton").disabled = true;
  document.getElementById("replaceLastSleepButton").disabled = true;
}

const logSleepButtonAction = () => {
  disableButtons()
  clearInterval(entryDisplayInterval);
  submitPosition(onWatchSuccess(submitAndProcessSleepEntry));
}

const replaceLastSleepButtonAction = () => {
  disableButtons()
  clearInterval(entryDisplayInterval);
  submitPosition(onWatchSuccess(submitAndProcessSleepEntryReplace));
}

const activateButtons = () => {
  document.getElementById("logSleepButton")
    .addEventListener('click', logSleepButtonAction);
  document.getElementById("replaceLastSleepButton")
    .addEventListener('click', replaceLastSleepButtonAction);
}

const loadLastSleepEntry = async () => {
  const sleepEntries = await getSleepEntries();

  if (sleepEntries.success) {
    const lastEntry = sleepEntries.data[sleepEntries.data.length - 1];
    showSleepEntry(lastEntry);
  } else {
    console.error(sleepEntries);
    document.getElementById('text').innerHTML = sleepEntries.message;
  }
};

window.onload = () => {
  activateButtons();
  loadLastSleepEntry();
};
