import {
  ErrorResponse,
  GetLastSleepRouteResponse,
  LogSleepRouteResponse,
  ReplaceLastSleepRouteResponse,
  VapidKeyRouteResponse,
} from "../../types.js";
import { getApiKey } from "./params.js";

export const getLastSleepEntry = async () => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep/last");

  const response = await fetch(url, { headers: getAuthHeaders(apiKey) });
  if (!response.ok) {
    const err = ErrorResponse.parse(await response.json());
    throw new Error(err.error);
  }
  return GetLastSleepRouteResponse.parse(await response.json());
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

  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep");

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(json),
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(apiKey),
    },
  });

  if (!response.ok) {
    const err = ErrorResponse.parse(await response.json());
    throw new Error(err.error);
  }
  return LogSleepRouteResponse.parse(await response.json());
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

  const apiKey = getApiKey();
  const url = getEndpointUrl("api/sleep/replace");

  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(json),
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(apiKey),
    },
  });

  if (!response.ok) {
    const err = ErrorResponse.parse(await response.json());
    throw new Error(err.error);
  }
  return ReplaceLastSleepRouteResponse.parse(await response.json());
};

const getEndpointUrl = (endpoint: string) => {
  return new URL(endpoint, window.location.href);
};

const getAuthHeaders = (apiKey?: string): Record<string, string> => {
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }
  return {};
};

export const getVapidPublicKey = async () => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/vapid-key");

  try {
    const response = await fetch(url, { headers: getAuthHeaders(apiKey) });
    if (!response.ok) {
      return null;
    }
    return VapidKeyRouteResponse.parse(await response.json()).publicKey;
  } catch {
    return null;
  }
};

export const subscribeToPush = async (
  subscription: PushSubscription
): Promise<boolean> => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/subscribe");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(subscription.toJSON()),
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(apiKey),
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const unsubscribeFromPush = async (
  endpoint: string
): Promise<boolean> => {
  const apiKey = getApiKey();
  const url = getEndpointUrl("api/push/unsubscribe");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ endpoint }),
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(apiKey),
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};
