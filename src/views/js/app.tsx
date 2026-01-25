import { useCallback, useEffect, useRef, useState } from "react";
import type { GetLastSleepRouteResponse, SheetsSleepEntry } from "../../types";
import {
  getLastSleepEntry,
  replaceLastSleepEntry,
  submitSleepEntry,
} from "./api.js";
import { formatDuration, printPosition } from "./utils.js";

const REQUIRED_ACCURACY = 40;
const ALLOWED_TIMESTAMP_AGE = 5000;

// Discriminated union for all possible app states
type AppStatus =
  | { type: "loading" }
  | { type: "idle"; entryData: GetLastSleepRouteResponse }
  | { type: "locatingTimestamp"; timestampAge: number }
  | { type: "locatingAccuracy"; currentAccuracy: number }
  | { type: "saving" }
  | {
      type: "submitted";
      action: "inserted" | "replaced";
      entry: SheetsSleepEntry;
    }
  | { type: "error"; message: string };

export const App = () => {
  const [status, setStatus] = useState<AppStatus>({ type: "loading" });
  const [, setTick] = useState(0); // Forces re-render for duration updates

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearDisplayInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearGeolocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startTickInterval = useCallback(() => {
    clearDisplayInterval();
    const SECOND = 1000;
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, SECOND);
  }, [clearDisplayInterval]);

  const handleApiSuccess = useCallback(
    (action: "inserted" | "replaced", entry: SheetsSleepEntry) => {
      setStatus({ type: "submitted", action, entry });
    },
    []
  );

  const handleApiError = useCallback((message: string) => {
    console.error(message);
    setStatus({ type: "error", message });
  }, []);

  const checkTimestamp = useCallback(
    (position: GeolocationPosition): boolean => {
      const timestampAge = Date.now() - position.timestamp;
      const timestampRecent = timestampAge < ALLOWED_TIMESTAMP_AGE;
      if (!timestampRecent) {
        setStatus({ type: "locatingTimestamp", timestampAge });
      }
      return timestampRecent;
    },
    []
  );

  const checkAccuracy = useCallback(
    (position: GeolocationPosition): boolean => {
      const accuracyAchieved = position.coords.accuracy < REQUIRED_ACCURACY;
      if (!accuracyAchieved) {
        setStatus({
          type: "locatingAccuracy",
          currentAccuracy: position.coords.accuracy,
        });
      }
      return accuracyAchieved;
    },
    []
  );

  const watchError = useCallback((err: GeolocationPositionError) => {
    console.log(`ERROR(${err.code}): ${err.message}`);
    setStatus({ type: "error", message: `ERROR(${err.code}): ${err.message}` });
  }, []);

  const submitPosition = useCallback(
    (onSuccess: (position: GeolocationPosition) => Promise<void>) => {
      if (!navigator.geolocation) {
        console.log("Geolocation is not supported by this browser.");
        setStatus({
          type: "error",
          message: "Geolocation is not supported by this browser.",
        });
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      const onWatchSuccess = async (position: GeolocationPosition) => {
        printPosition(position);

        if (!checkTimestamp(position)) {
          return;
        }
        if (!checkAccuracy(position)) {
          return;
        }

        setStatus({ type: "saving" });
        clearGeolocationWatch();

        await onSuccess(position);
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        onWatchSuccess,
        watchError,
        options
      );
    },
    [checkTimestamp, checkAccuracy, clearGeolocationWatch, watchError]
  );

  const submitAndProcessSleepEntry = useCallback(
    async (position: GeolocationPosition) => {
      const response = await submitSleepEntry(position);
      if (response.success) {
        handleApiSuccess("inserted", response.data.updatedRow);
      } else {
        handleApiError(response.message);
      }
    },
    [handleApiSuccess, handleApiError]
  );

  const submitAndProcessSleepEntryReplace = useCallback(
    async (position: GeolocationPosition) => {
      const response = await replaceLastSleepEntry(position);
      if (response.success) {
        handleApiSuccess("replaced", response.data.updatedRow);
      } else {
        handleApiError(response.message);
      }
    },
    [handleApiSuccess, handleApiError]
  );

  const logSleepButtonAction = useCallback(() => {
    clearDisplayInterval();
    submitPosition(submitAndProcessSleepEntry);
  }, [clearDisplayInterval, submitPosition, submitAndProcessSleepEntry]);

  const replaceLastSleepButtonAction = useCallback(() => {
    clearDisplayInterval();
    submitPosition(submitAndProcessSleepEntryReplace);
  }, [clearDisplayInterval, submitPosition, submitAndProcessSleepEntryReplace]);

  const loadLastSleepEntry = useCallback(async () => {
    const apiResponse = await getLastSleepEntry();
    if (apiResponse.success) {
      setStatus({ type: "idle", entryData: apiResponse.data });
      startTickInterval();
    } else {
      console.error(apiResponse);
      setStatus({ type: "error", message: apiResponse.message });
    }
  }, [startTickInterval]);

  // Initial load effect
  useEffect(() => {
    loadLastSleepEntry();

    return () => {
      clearDisplayInterval();
      clearGeolocationWatch();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive button states from status
  const logButtonDisabled = status.type !== "idle";
  const replaceButtonDisabled =
    status.type !== "idle" || !!status.entryData.lastSleepEntry.Duration;

  return (
    <div className="m-1">
      <LayoutTable
        logButtonDisabled={logButtonDisabled}
        onLogSleep={logSleepButtonAction}
        onReplaceSleep={replaceLastSleepButtonAction}
        replaceButtonDisabled={replaceButtonDisabled}
        status={status}
      />
    </div>
  );
};

// --- Display Components ---

type SleepEntryDetailsProps = {
  entry: SheetsSleepEntry;
};

const SleepEntryDetails: React.FC<SleepEntryDetailsProps> = ({ entry }) => (
  <div>
    {Object.entries(entry).map(([key, value]) => (
      <div key={key}>
        {key}: {value}
      </div>
    ))}
  </div>
);

type IdleDisplayProps = {
  entryData: GetLastSleepRouteResponse;
};

const IdleDisplay: React.FC<IdleDisplayProps> = ({ entryData }) => {
  const [date, time] = entryData.lastSleepEntry["UTC time"].split(" ");
  const formattedUTCDate = `${date}T${time}Z`;
  const timeDiff = Date.now() - new Date(formattedUTCDate).getTime();
  const isAwake = !!entryData.lastSleepEntry.Duration;

  return (
    <>
      <div>
        {isAwake ? "🌞 Awake" : "😴 Asleep"} for {formatDuration(timeDiff)}
      </div>
      <br />
      <div>
        Last sleep entry:
        <br />
        <SleepEntryDetails entry={entryData.lastSleepEntry} />
      </div>
      <br />
      <div>Sleep entries in total: {entryData.numberOfSleepEntries}</div>
    </>
  );
};

type SubmittedDisplayProps = {
  action: "inserted" | "replaced";
  entry: SheetsSleepEntry;
};

const SubmittedDisplay: React.FC<SubmittedDisplayProps> = ({
  action,
  entry,
}) => (
  <>
    <div>{action === "inserted" ? "Inserted" : "Replaced"} row:</div>
    <SleepEntryDetails entry={entry} />
  </>
);

type StatusDisplayProps = {
  status: AppStatus;
};

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  switch (status.type) {
    case "loading":
      return <div>Getting last sleep log...</div>;

    case "idle":
      return <IdleDisplay entryData={status.entryData} />;

    case "locatingTimestamp":
      return (
        <div>
          Timestamp too old ({status.timestampAge} milliseconds)
          <br />
          Trying again...
        </div>
      );

    case "locatingAccuracy":
      return (
        <div>
          Current accuracy: {status.currentAccuracy} meters
          <br />
          Required accuracy: {REQUIRED_ACCURACY} meters
          <br />
          Trying again...
        </div>
      );

    case "saving":
      return <div>Accuracy and timestamp OK, saving...</div>;

    case "submitted":
      return <SubmittedDisplay action={status.action} entry={status.entry} />;

    case "error":
      return <div>{status.message}</div>;
  }
};

// --- Layout Components ---

type LayoutTableProps = {
  logButtonDisabled: boolean;
  replaceButtonDisabled: boolean;
  status: AppStatus;
  onLogSleep: () => void;
  onReplaceSleep: () => void;
};

const LayoutTable: React.FC<LayoutTableProps> = ({
  logButtonDisabled,
  replaceButtonDisabled,
  status,
  onLogSleep,
  onReplaceSleep,
}) => (
  <table className="table-responsive table-borderless table">
    <tbody>
      <tr>
        <td>
          <LogSleepButton disabled={logButtonDisabled} onClick={onLogSleep} />
        </td>
      </tr>
      <tr>
        <td>
          <ReplaceConfirmationButton disabled={replaceButtonDisabled} />
          <ConfirmationModal onConfirm={onReplaceSleep} />
        </td>
      </tr>
      <tr>
        <td>
          <StatusDisplay status={status} />
        </td>
      </tr>
    </tbody>
  </table>
);

type LogSleepButtonProps = {
  disabled: boolean;
  onClick: () => void;
};

const LogSleepButton: React.FC<LogSleepButtonProps> = ({
  disabled,
  onClick,
}) => (
  <button
    className="btn btn-success btn-lg"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    Log sleep entry
  </button>
);

type ReplaceConfirmationButtonProps = {
  disabled: boolean;
};

const ReplaceConfirmationButton: React.FC<ReplaceConfirmationButtonProps> = ({
  disabled,
}) => (
  <button
    className="btn btn-primary btn-lg"
    data-bs-target="#confirmationModal"
    data-bs-toggle="modal"
    disabled={disabled}
    type="button"
  >
    Replace last sleep entry
  </button>
);

type ConfirmationModalProps = {
  onConfirm: () => void;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm }) => (
  <div className="modal fade" id="confirmationModal" tabIndex={-1}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Confirm replace</h5>
          <button
            aria-label="Close"
            className="btn-close"
            data-bs-dismiss="modal"
            type="button"
          />
        </div>
        <div className="modal-body">
          Are you sure you want to replace the last sleep entry?
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            data-bs-dismiss="modal"
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            data-bs-dismiss="modal"
            onClick={onConfirm}
            type="button"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  </div>
);
