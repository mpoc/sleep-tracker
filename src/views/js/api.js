export const getSleepEntries = async () => {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = getEndpointUrl("api/sleep", apiKey);

  return await fetch(url)
    .then(res => res.json())
    .catch(err => console.error(err));
};

export const submitSleepEntry = async (position) => {
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

  const url = getEndpointUrl("api/sleep", apiKey);

  return await fetch(url, options)
    .then(res => res.json())
    .catch(err => console.error(err));
};

export const replaceLastSleepEntry = async (position) => {
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
    method: 'PUT',
    body: JSON.stringify(json),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const apiKey = getApiKey();
  if (!apiKey) return;

  const url = getEndpointUrl("api/sleep/replace", apiKey);

  return await fetch(url, options)
    .then(res => res.json())
    .catch(err => console.error(err));
}

const getEndpointUrl = (endpoint, apiKey) => {
  const url = new URL(endpoint, window.location.href + '/');
  if (apiKey) {
    url.searchParams.append('apiKey', apiKey);
  }
  return url;
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
