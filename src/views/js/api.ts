import type { ApiResponse, GetLastSleepRouteResponse } from "../../types.js";
import { getApiKey } from "./params.js";

export const getSleepEntries = async () => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep", apiKey);

  return await fetch(url)
    .then((res) => res.json())
    .catch((err) => console.error(err));
};

export const getLastSleepEntry = async () => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep/last", apiKey);

  const response = await fetch(url)
    .then((res) => res.json())
    .catch((err) => console.error(err));

  return response as ApiResponse<GetLastSleepRouteResponse>;
};

export const submitSleepEntry = async (position: GeolocationPosition) => {
  const json = {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    },
    timestamp: position.timestamp,
  };

  const options = {
    method: "POST",
    body: JSON.stringify(json),
    headers: {
      "Content-Type": "application/json",
    },
  };

  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep", apiKey);

  return await fetch(url, options)
    .then((res) => res.json())
    .catch((err) => console.error(err));
};

export const replaceLastSleepEntry = async (position: GeolocationPosition) => {
  const json = {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    },
    timestamp: position.timestamp,
  };

  const options = {
    method: "PUT",
    body: JSON.stringify(json),
    headers: {
      "Content-Type": "application/json",
    },
  };

  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep/replace", apiKey);

  return await fetch(url, options)
    .then((res) => res.json())
    .catch((err) => console.error(err));
};

const getEndpointUrl = (endpoint: string, apiKey?: string) => {
  const url = new URL(endpoint, window.location.href);
  if (apiKey) {
    url.searchParams.append("apiKey", apiKey);
  }
  return url;
};

export const getVapidPublicKey = async (): Promise<string | null> => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/vapid-key", apiKey);

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.success) {
      return data.data.publicKey;
    }
    return null;
  } catch {
    return null;
  }
};

export const subscribeToPush = async (
  subscription: PushSubscription
): Promise<boolean> => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/subscribe", apiKey);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(subscription.toJSON()),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
};

export const unsubscribeFromPush = async (
  endpoint: string
): Promise<boolean> => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/unsubscribe", apiKey);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ endpoint }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
};
