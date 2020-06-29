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

  const searchParams = new URLSearchParams(window.location.search);
  const apiKey = searchParams.get('apiKey');
  fetch('/api/sleep?apiKey=' + apiKey, options)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const entries = Object.entries(data.data.updatedRow).map(([key, value]) => `${key}: ${value}`);
        document.getElementById('text').innerHTML =
          `Inserted row:<br>${entries.join(",<br>")}`;
        const timeDiff = new Date() - new Date(data.data.updatedRow['Timezone local time']);
        console.log(`${timeDiff / 1000} seconds ago.`)
      }
    })
    .catch(err => {
      console.error(err);
    });
};

const positionSuccess = position => {
  const crd = position.coords;

  console.log(
    `Timestamp: ${new Date(position.timestamp)} (${position.timestamp})`
  );
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

window.onload = () => {
  getPosition();
};
