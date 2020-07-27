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

  const url = constructApiUrl(apiKey);

  fetch(url, options)
    .then(res => res.json())
    .then(processApiResponse)
    .catch(err => console.error(err));
};

const processApiResponse = data => {
  if (data.success) {
    const insertedRowText =
      Object.entries(data.data.updatedRow)
        .map(([key, value]) => `${key}: ${value}`)
        .join(",<br>");

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

const constructApiUrl = apiKey => {
  const url = new URL('api/sleep', window.location.href + '/');
  url.searchParams.append('apiKey', apiKey);
  return url;
}

const REQUIRED_ACCURACY = 25;
let watchID;

const watchSuccess = position => {
  printPosition(position);
  checkAccuracy(position);
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

const checkAccuracy = position => {
  const accuracyAchieved = position.coords.accuracy > REQUIRED_ACCURACY;
  if (accuracyAchieved) {
    document.getElementById(
      'text'
    ).innerHTML = `Current accuracy: ${position.coords.accuracy} meters<br>Required accuracy: ${REQUIRED_ACCURACY} meters<br>Trying again...`;
  } else {
    document.getElementById('text').innerHTML = "Accuracy achieved, saving...";
    navigator.geolocation.clearWatch(watchID);
    submit(position);
  }
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

window.onload = () => {
  watchPosition();
};
