export const formatDuration = (duration: number) => {
  // biome-ignore lint/style/noMagicNumbers: <milliseconds in second>
  const secondsDiff = duration / 1000;

  // biome-ignore lint/style/noMagicNumbers: <seconds in hour>
  const hours = Math.floor(secondsDiff / 3600);
  const minutes = Math.floor((secondsDiff / 60) % 60);
  const seconds = Math.floor(secondsDiff % 60);

  // const hour = { singular: ' hour', plural: ' hours' };
  // const minute = { singular: ' minute', plural: ' minutes' };
  // const second = { singular: ' second', plural: ' seconds' };

  const hour = { singular: "h", plural: "h" };
  const minute = { singular: "m", plural: "m" };
  const second = { singular: "s", plural: "s" };

  const hoursString = hours + (hours == 1 ? hour.singular : hour.plural);
  const minutesString =
    minutes + (minutes == 1 ? minute.singular : minute.plural);
  const secondsString =
    seconds + (seconds == 1 ? second.singular : second.plural);

  // return hoursString + " " + minutesString + " " + secondsString;

  return (
    (hours == 0 ? "" : hoursString) +
    " " +
    (hours == 0 && minutes == 0 ? "" : minutesString) +
    " " +
    secondsString
  );
};

export const prettyObjectString = (object: Record<string, any>) =>
  Object.entries(object)
    .map(([key, value]) => `${key}: ${value}`)
    .join(",<br>");

export const printPosition = (position: GeolocationPosition) => {
  console.log(
    `Timestamp: ${new Date(position.timestamp)} (${position.timestamp})`
  );
  console.log("Your current position is:");
  console.log(`Latitude: ${position.coords.latitude}`);
  console.log(`Longitude: ${position.coords.longitude}`);
  console.log(`More or less ${position.coords.accuracy} meters.`);
};
