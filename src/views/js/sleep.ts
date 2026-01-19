import type {
  ApiResponse,
  GetLastSleepRouteResponse,
  LogSleepRouteResponse,
  ReplaceLastSleepRouteResponse,
} from "../../types";
import {
  getLastSleepEntry,
  replaceLastSleepEntry,
  submitSleepEntry,
} from "./api.js";
import { getAutoLog } from "./params.js";
import { formatDuration, prettyObjectString, printPosition } from "./utils.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/static/sw.js");
}

const processSleepApiResponse = (data: ApiResponse<LogSleepRouteResponse>) => {
  if (data.success) {
    const insertedRowText = prettyObjectString(data.data.updatedRow);
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = `Inserted row:<br>${insertedRowText}`;
    }
  } else {
    console.error(data);
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = data.message;
    }
  }
};

const processReplaceApiResponse = (
  data: ApiResponse<ReplaceLastSleepRouteResponse>
) => {
  if (data.success) {
    const insertedRowText = prettyObjectString(data.data.updatedRow);
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = `Replaced row:<br>${insertedRowText}`;
    }
  } else {
    console.error(data);
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = data.message;
    }
  }
};

const REQUIRED_ACCURACY = 40;
let watchID: number;

const submitPosition = (
  curriedSuccessFn: (position: GeolocationPosition) => Promise<void>
) => {
  if (!geolocationAvailable()) {
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };

  watchID = navigator.geolocation.watchPosition(
    curriedSuccessFn,
    watchError,
    options
  );
};

const onWatchSuccess =
  (successFn: (position: GeolocationPosition) => Promise<void>) =>
  async (position: GeolocationPosition) => {
    printPosition(position);

    if (!checkTimestamp(position)) {
      return;
    }
    if (!checkAccuracy(position)) {
      return;
    }

    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = "Accuracy and timestamp OK, saving...";
    }
    navigator.geolocation.clearWatch(watchID);

    await successFn(position);
  };

const watchError = (err: GeolocationPositionError) => {
  const errorText = `ERROR(${err.code}): ${err.message}`;
  console.log(errorText);
  const textElement = document.getElementById("text");
  if (textElement) {
    textElement.innerHTML = errorText;
  }
};

const submitAndProcessSleepEntry = async (position: GeolocationPosition) => {
  const response = await submitSleepEntry(position);
  processSleepApiResponse(response);
};

const submitAndProcessSleepEntryReplace = async (
  position: GeolocationPosition
) => {
  const response = await replaceLastSleepEntry(position);
  processReplaceApiResponse(response);
};

const checkTimestamp = (position: GeolocationPosition) => {
  const ALLOWED_TIMESTAMP_AGE = 5000;
  const timestampAge = Date.now() - position.timestamp;
  const timestampRecent = timestampAge < ALLOWED_TIMESTAMP_AGE;
  if (!timestampRecent) {
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = `Timestamp too old (${timestampAge} milliseconds)<br>Trying again...`;
    }
  }
  return timestampRecent;
};

const checkAccuracy = (position: GeolocationPosition) => {
  const accuracyAchieved = position.coords.accuracy < REQUIRED_ACCURACY;
  if (!accuracyAchieved) {
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = `Current accuracy: ${position.coords.accuracy} meters<br>Required accuracy: ${REQUIRED_ACCURACY} meters<br>Trying again...`;
    }
  }
  return accuracyAchieved;
};

const geolocationAvailable = () => {
  if (navigator.geolocation) {
    return true;
  }
  console.log("Geolocation is not supported by this browser.");
  const textElement = document.getElementById("text");
  if (textElement) {
    textElement.innerHTML = "Geolocation is not supported by this browser.";
  }
  return false;
};

let entryDisplayInterval: ReturnType<typeof setInterval>;

const showSleepEntry = (entryData: GetLastSleepRouteResponse) => {
  const logSleepButton = document.getElementById("logSleepButton");
  if (logSleepButton) {
    logSleepButton.removeAttribute("disabled");
  }

  const lastSleepEntryIsStop = !!entryData.lastSleepEntry.Duration;
  if (!lastSleepEntryIsStop) {
    const replaceConfirmationButton = document.getElementById(
      "replaceConfirmationButton"
    );
    if (replaceConfirmationButton) {
      replaceConfirmationButton.removeAttribute("disabled");
    }
  }
  startEntryDisplay(entryData);
};

const updateEntryDisplay = (entryData: GetLastSleepRouteResponse) => {
  const [date, time] = entryData.lastSleepEntry["UTC time"].split(" ");
  const formattedUTCDate = `${date}T${time}Z`;

  const timeDiff = Date.now() - new Date(formattedUTCDate).getTime();

  const lastSleepEntryIsStop = !!entryData.lastSleepEntry.Duration;

  const textElement = document.getElementById("text");
  if (textElement) {
    textElement.innerHTML = `
    <div>
      ${lastSleepEntryIsStop ? "🌞 Awake" : "😴 Asleep"} for ${formatDuration(timeDiff)}
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
};

const startEntryDisplay = (entryData: GetLastSleepRouteResponse) => {
  // Initial start
  updateEntryDisplay(entryData);

  // Loop
  clearInterval(entryDisplayInterval);
  const SECOND = 1000;
  entryDisplayInterval = setInterval(
    () => updateEntryDisplay(entryData),
    SECOND
  );
};

const enableButtons = () => {
  const logSleepButton = document.getElementById("logSleepButton");
  if (logSleepButton) {
    logSleepButton.removeAttribute("disabled");
  }
  const replaceConfirmationButton = document.getElementById(
    "replaceConfirmationButton"
  );
  if (replaceConfirmationButton) {
    replaceConfirmationButton.removeAttribute("disabled");
  }
};

const disableButtons = () => {
  const logSleepButton = document.getElementById("logSleepButton");
  if (logSleepButton) {
    logSleepButton.setAttribute("disabled", "true");
  }
  const replaceConfirmationButton = document.getElementById(
    "replaceConfirmationButton"
  );
  if (replaceConfirmationButton) {
    replaceConfirmationButton.setAttribute("disabled", "true");
  }
};

const logSleepButtonAction = () => {
  disableButtons();
  clearInterval(entryDisplayInterval);
  submitPosition(onWatchSuccess(submitAndProcessSleepEntry));
};

const replaceLastSleepButtonAction = () => {
  disableButtons();
  clearInterval(entryDisplayInterval);
  submitPosition(onWatchSuccess(submitAndProcessSleepEntryReplace));
};

const activateButtons = () => {
  const logSleepButton = document.getElementById("logSleepButton");
  if (logSleepButton) {
    logSleepButton.addEventListener("click", logSleepButtonAction);
  }
  const replaceLastSleepButton = document.getElementById(
    "replaceLastSleepButton"
  );
  if (replaceLastSleepButton) {
    replaceLastSleepButton.addEventListener(
      "click",
      replaceLastSleepButtonAction
    );
  }
};

const loadLastSleepEntry = async () => {
  const apiResponse = await getLastSleepEntry();
  if (apiResponse.success) {
    const lastEntryData = apiResponse.data;
    showSleepEntry(lastEntryData);
  } else {
    console.error(apiResponse);
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = apiResponse.message;
    }
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
