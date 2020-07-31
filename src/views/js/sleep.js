const submit = position => {
  const json = {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    },
    timestamp: position.timestamp,
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(json),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = constructSleepApiUrl(apiKey);

  fetch(url, options)
    .then(res => res.json())
    .then(processApiResponse)
    .catch(err => console.error(err));
};

const processApiResponse = data => {
  if (data.success) {
    const insertedRowText = prettyObjectString(data.data.updatedRow);

    document.getElementById('text').innerHTML = `Inserted row:<br>${insertedRowText}`;

    const timeDiff = new Date() - new Date(data.data.updatedRow['Timezone local time']);
    console.log(`${timeDiff / 1000} seconds ago.`)
  } else {
    console.error(data);
    document.getElementById('text').innerHTML = data.message;
  }
}

const getApiKey = () => {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has('apiKey')) {
    document.getElementById('text').innerHTML = 'No API key provided';
    return null;
  }
  const apiKey = searchParams.get('apiKey');
  return apiKey;
}

const constructSleepApiUrl = apiKey => {
  const url = new URL('api/sleep', window.location.href + '/');
  url.searchParams.append('apiKey', apiKey);
  return url;
}

const constructReplaceApiUrl = apiKey => {
  const url = new URL('api/sleep/replace', window.location.href + '/');
  url.searchParams.append('apiKey', apiKey);
  return url;
}

const REQUIRED_ACCURACY = 25;
let watchID;

const watchSuccess = position => {
  printPosition(position);

  if (!checkTimestamp(position)) return;
  if (!checkAccuracy(position)) return;

  document.getElementById('text').innerHTML = "Accuracy and timestamp OK, saving...";
  navigator.geolocation.clearWatch(watchID);
  submit(position);
}

const watchError = err => {
  const errorText = `ERROR(${err.code}): ${err.message}`;
  console.log(errorText);
  document.getElementById('text').innerHTML = errorText;
};

const watchPosition = () => {
  if (!geolocationAvailable()) return;

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };
  
  watchID = navigator.geolocation.watchPosition(watchSuccess, watchError, options);
}

const printPosition = position => {
  console.log(`Timestamp: ${new Date(position.timestamp)} (${position.timestamp})`);
  console.log('Your current position is:');
  console.log(`Latitude: ${position.coords.latitude}`);
  console.log(`Longitude: ${position.coords.longitude}`);
  console.log(`More or less ${position.coords.accuracy} meters.`);
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

const prettyObjectString = object => Object.entries(object)
  .map(([key, value]) => `${key}: ${value}`)
  .join(",<br>");

let entryDisplayInterval;

const showLastSleepEntry = data => {
  if (data.success) {
    enableButtons();
    const lastEntry = data.data[data.data.length - 1];
    updateEntryDisplay(lastEntry);
    clearInterval(entryDisplayInterval);
    entryDisplayInterval = setInterval(() => updateEntryDisplay(lastEntry), 1000);
  } else {
    console.error(data);
    document.getElementById('text').innerHTML = data.message;
  }
}

const updateEntryDisplay = entry => {
  const splitUTCDate = entry['UTC time'].split(" ");
  const formattedUTCDate = splitUTCDate[0] + "T" + splitUTCDate[1] + "Z";
  
  const timeDiff = new Date() - new Date(formattedUTCDate);
  
  document.getElementById('text').innerHTML =
    `Last sleep entry:<br><br>${prettyObjectString(entry)}<br><br>${formatDuration(timeDiff)} ago.`;
}

const loadLastSleepEntry = () => {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = constructSleepApiUrl(apiKey);

  fetch(url)
    .then(res => res.json())
    .then(showLastSleepEntry)
    .catch(err => console.error(err));
};

const formatDuration = duration => {
  const secondsDiff = duration / 1000;

  const hours = parseInt(secondsDiff / 3600);
  const minutes = parseInt((secondsDiff / 60) % 60);
  const seconds = parseInt(secondsDiff % 60);

  // const hour = { singular: ' hour', plural: ' hours' };
  // const minute = { singular: ' minute', plural: ' minutes' };
  // const second = { singular: ' second', plural: ' seconds' };

  const hour = { singular: 'h', plural: 'h' };
  const minute = { singular: 'm', plural: 'm' };
  const second = { singular: 's', plural: 's' };
  
  const hoursString = hours + (hours == 1 ? hour.singular : hour.plural);
  const minutesString = minutes + (minutes == 1 ? minute.singular : minute.plural);
  const secondsString = seconds + (seconds == 1 ? second.singular : second.plural);
  
  // return hoursString + " " + minutesString + " " + secondsString;

  return (hours == 0 ? "" : hoursString) + " " +
    ((hours == 0 & minutes == 0) ? "" : minutesString) + " " +
    secondsString;
}

const activateButtons = () => {
  document.getElementById("logSleepButton")
    .addEventListener('click', logSleepButtonAction);
  document.getElementById("replaceLastSleepButton")
    .addEventListener('click', replaceLastSleepButtonAction);
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
  watchPosition();
}

const replaceLastSleepButtonAction = () => {
  const json = {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    },
    timestamp: position.timestamp,
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(json),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = constructSleepApiUrl(apiKey);

  fetch(url, options)
    .then(res => res.json())
    .then(processApiResponse)
    .catch(err => console.error(err));
}

window.onload = () => {
  // watchPosition();
  loadLastSleepEntry();
  activateButtons();
};
