import { useCallback, useEffect, useState } from "react";
import { getVapidPublicKey, subscribeToPush } from "../api.js";

type PushNotificationStatus =
  | "loading"
  | "unsupported"
  | "prompt" // Permission not yet asked
  | "subscribed"
  | "denied"
  | "error";

const urlBase64ToUint8Array = (
  base64String: string
): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = () => {
  const [status, setStatus] = useState<PushNotificationStatus>("loading");
  const [isEnabling, setIsEnabling] = useState(false);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        setStatus("error");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const success = await subscribeToPush(subscription);
      if (success) {
        setStatus("subscribed");
        return true;
      }

      await subscription.unsubscribe();
      setStatus("error");
      return false;
    } catch (error) {
      console.error("Failed to subscribe:", error);
      if (Notification.permission === "denied") {
        setStatus("denied");
      } else {
        setStatus("error");
      }
      return false;
    }
  }, []);

  // Check status and auto-subscribe if permission already granted
  useEffect(() => {
    const init = async () => {
      if (!("serviceWorker" in navigator && "PushManager" in window)) {
        setStatus("unsupported");
        return;
      }

      const permission = Notification.permission;

      if (permission === "denied") {
        setStatus("denied");
        return;
      }

      if (permission === "default") {
        setStatus("prompt");
        return;
      }

      // Permission is "granted" - check/create subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription =
          await registration.pushManager.getSubscription();

        if (existingSubscription) {
          setStatus("subscribed");
        } else {
          // Auto-subscribe since permission already granted
          await subscribe();
        }
      } catch {
        setStatus("error");
      }
    };

    init();
  }, [subscribe]);

  const enableNotifications = useCallback(async () => {
    setIsEnabling(true);
    await subscribe();
    setIsEnabling(false);
  }, [subscribe]);

  return {
    status,
    isEnabling,
    enableNotifications,
  };
};
