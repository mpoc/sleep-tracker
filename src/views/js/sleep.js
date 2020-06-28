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

  fetch('/api/sleep', options)
    .then(res => res.json())
    .then(data => {})
    .catch(err => {
      console.error(err);
    });
};

const positionSuccess = position => {
  const crd = position.coords;

  console.log(`Timestamp: ${new Date(position.timestamp)}`);
  console.log('Your current position is:');
  console.log(`Latitude: ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);

  submit(position);
};

const positionError = err => {
  console.log(`ERROR(${err.code}): ${err.message}`);
  document.getElementById('text').innerHTML = `ERROR(${err.code}): ${err.message}`;
};

const getPosition = () => {
  if (navigator.geolocation) {
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };
    navigator.geolocation.getCurrentPosition(
      positionSuccess,
      positionError,
      options
    );
  } else {
    console.log('Geolocation is not supported by this browser.');
    document.getElementById(
      'text'
    ).innerHTML = 'Geolocation is not supported by this browser.';
  }
}

getPosition();
