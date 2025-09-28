import {
  formatDuration,
  prettyObjectString,
  printPosition
} from './utils.js';
import {
  getLastSleepEntry,
  submitSleepEntry,
  replaceLastSleepEntry
} from './api.js'
import { getAutoLog } from './params.js'

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

const REQUIRED_ACCURACY = 40;
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
  const ALLOWED_TIMESTAMP_AGE = 5000;
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

const showSleepEntry = (entryData) => {
  document.getElementById("logSleepButton").disabled = false;
  const lastSleepEntryIsStop = !!entryData.lastSleepEntry['Duration'];
  if (!lastSleepEntryIsStop) {
    document.getElementById("replaceConfirmationButton").disabled = false;
  }
  startEntryDisplay(entryData);
}

const updateEntryDisplay = entryData => {
  const [date, time] = entryData.lastSleepEntry['UTC time'].split(" ");
  const formattedUTCDate = date + "T" + time + "Z";

  const timeDiff = new Date() - new Date(formattedUTCDate);

  const lastSleepEntryIsStop = !!entryData.lastSleepEntry['Duration'];

  document.getElementById('text').innerHTML = `
    <div>
      ${lastSleepEntryIsStop ? '🌞 Awake' : '😴 Asleep'} for ${formatDuration(timeDiff)}
    </div>
    <br>
    <div>
      Last sleep entry:
      <br>
      ${prettyObjectString(entryData.lastSleepEntry)}
    </div>
    <br>
    <div>
      Sleep entries in total: ${entryData.numberOfSleepEntries}
    </div>
  `;
}

const startEntryDisplay = (entryData) => {
  // Initial start
  updateEntryDisplay(entryData);

  // Loop
  clearInterval(entryDisplayInterval);
  entryDisplayInterval = setInterval(() => updateEntryDisplay(entryData), 1000);
}

const enableButtons = () => {
  document.getElementById("logSleepButton").disabled = false;
  document.getElementById("replaceConfirmationButton").disabled = false;
}

const disableButtons = () => {
  document.getElementById("logSleepButton").disabled = true;
  document.getElementById("replaceConfirmationButton").disabled = true;
}

const logSleepButtonAction = () => {
  disableButtons();
  clearInterval(entryDisplayInterval);
  submitPosition(onWatchSuccess(submitAndProcessSleepEntry));
}

const replaceLastSleepButtonAction = () => {
  disableButtons();
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
  const apiResponse = await getLastSleepEntry();
  if (apiResponse.success) {
    const lastEntryData = apiResponse.data;
    showSleepEntry(lastEntryData);
  } else {
    console.error(apiResponse);
    document.getElementById('text').innerHTML = apiResponse.message;
  }
};

window.onload = () => {
  const autoLog = getAutoLog();
  if (autoLog) {
    logSleepButtonAction();
  } else {
    activateButtons();
    loadLastSleepEntry();
  }
};
