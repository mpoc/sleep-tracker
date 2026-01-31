import { useCallback, useEffect, useRef } from "react";

export type GeolocationProgress =
  | { type: "waitingForTimestamp"; timestampAge: number }
  | {
      type: "waitingForAccuracy";
      currentAccuracy: number;
      requiredAccuracy: number;
    }
  | { type: "error"; message: string };

type ProgressCallback = (progress: GeolocationProgress) => void;

type UseGeolocationWatchOptions = {
  requiredAccuracy?: number;
  maxTimestampAge?: number;
};

export function useGeolocationWatch(options: UseGeolocationWatchOptions = {}) {
  const { requiredAccuracy = 40, maxTimestampAge = 5000 } = options;

  const watchIdRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const watchForPosition = useCallback(
    (onProgress?: ProgressCallback): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by this browser."));
          return;
        }

        const watchOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            console.log(
              `Timestamp: ${new Date(position.timestamp)} (${position.timestamp})`
            );
            console.log("Your current position is:");
            console.log(`Latitude: ${position.coords.latitude}`);
            console.log(`Longitude: ${position.coords.longitude}`);
            console.log(`More or less ${position.coords.accuracy} meters.`);

            // Check timestamp freshness
            const timestampAge = Date.now() - position.timestamp;
            if (timestampAge >= maxTimestampAge) {
              onProgress?.({ type: "waitingForTimestamp", timestampAge });
              return;
            }

            // Check accuracy
            if (position.coords.accuracy >= requiredAccuracy) {
              onProgress?.({
                type: "waitingForAccuracy",
                currentAccuracy: position.coords.accuracy,
                requiredAccuracy,
              });
              return;
            }

            // Position meets criteria
            clearWatch();
            resolve(position);
          },
          (err) => {
            const message = `ERROR(${err.code}): ${err.message}`;
            // PERMISSION_DENIED is fatal - stop watching
            if (err.code === err.PERMISSION_DENIED) {
              clearWatch();
              reject(new Error(message));
              return;
            }
            // Other errors (TIMEOUT, POSITION_UNAVAILABLE) - report but keep trying
            onProgress?.({ type: "error", message });
          },
          watchOptions
        );
      });
    },
    [requiredAccuracy, maxTimestampAge, clearWatch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return clearWatch;
  }, [clearWatch]);

  return { watchForPosition, clearWatch };
}
