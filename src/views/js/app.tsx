import { useCallback, useEffect, useRef, useState } from "react";
import { useInterval } from "usehooks-ts";
import type { GetLastSleepRouteResponse, SheetsSleepEntry } from "../../types";
import {
  getLastSleepEntry,
  replaceLastSleepEntry,
  submitSleepEntry,
} from "./api.js";
import {
  type GeolocationProgress,
  useGeolocationWatch,
} from "./hooks/useGeolocationWatch.js";
import { formatDuration } from "./utils.js";

const REQUIRED_ACCURACY = 40;
const ALLOWED_TIMESTAMP_AGE = 5000;

// Common fields for all locating states
type LocatingInfo = {
  startTime: number;
  attempts: number;
};

// Discriminated union for all possible app states
type AppStatus =
  | { type: "loading" }
  | { type: "idle"; entryData: GetLastSleepRouteResponse }
  | { type: "locating"; info: LocatingInfo }
  | { type: "locatingTimestamp"; timestampAge: number; info: LocatingInfo }
  | { type: "locatingAccuracy"; currentAccuracy: number; info: LocatingInfo }
  | { type: "locatingError"; message: string; info: LocatingInfo }
  | { type: "saving" }
  | {
      type: "submitted";
      action: "inserted" | "replaced";
      entry: SheetsSleepEntry;
    }
  | { type: "error"; message: string };

export const App = () => {
  const [status, setStatus] = useState<AppStatus>({ type: "loading" });
  const [, setTick] = useState(0); // Forces re-render for duration/elapsed updates
  const locatingInfoRef = useRef<LocatingInfo>({ startTime: 0, attempts: 0 });

  const { watchForPosition } = useGeolocationWatch({
    requiredAccuracy: REQUIRED_ACCURACY,
    maxTimestampAge: ALLOWED_TIMESTAMP_AGE,
  });

  // Check if currently in any locating state
  const isLocating =
    status.type === "locating" ||
    status.type === "locatingTimestamp" ||
    status.type === "locatingAccuracy" ||
    status.type === "locatingError";

  // Tick interval runs when idle (for duration) or locating (for elapsed time)
  useInterval(
    () => setTick((t) => t + 1),
    status.type === "idle" || isLocating ? 1000 : null
  );

  const handleProgress = useCallback((progress: GeolocationProgress) => {
    locatingInfoRef.current.attempts += 1;
    const info = { ...locatingInfoRef.current };

    switch (progress.type) {
      case "waitingForTimestamp":
        setStatus({
          type: "locatingTimestamp",
          timestampAge: progress.timestampAge,
          info,
        });
        break;
      case "waitingForAccuracy":
        setStatus({
          type: "locatingAccuracy",
          currentAccuracy: progress.currentAccuracy,
          info,
        });
        break;
      case "error":
        // Non-fatal error (timeout, position unavailable) - show but keep trying
        setStatus({ type: "locatingError", message: progress.message, info });
        break;
    }
  }, []);

  const logSleepButtonAction = useCallback(async () => {
    locatingInfoRef.current = { startTime: Date.now(), attempts: 0 };
    setStatus({ type: "locating", info: locatingInfoRef.current });
    try {
      const position = await watchForPosition(handleProgress);
      setStatus({ type: "saving" });

      const response = await submitSleepEntry(position);
      if (response.success) {
        setStatus({
          type: "submitted",
          action: "inserted",
          entry: response.data.updatedRow,
        });
      } else {
        setStatus({ type: "error", message: response.message });
      }
    } catch (error) {
      setStatus({ type: "error", message: (error as Error).message });
    }
  }, [watchForPosition, handleProgress]);

  const replaceLastSleepButtonAction = useCallback(async () => {
    locatingInfoRef.current = { startTime: Date.now(), attempts: 0 };
    setStatus({ type: "locating", info: locatingInfoRef.current });
    try {
      const position = await watchForPosition(handleProgress);
      setStatus({ type: "saving" });

      const response = await replaceLastSleepEntry(position);
      if (response.success) {
        setStatus({
          type: "submitted",
          action: "replaced",
          entry: response.data.updatedRow,
        });
      } else {
        setStatus({ type: "error", message: response.message });
      }
    } catch (error) {
      setStatus({ type: "error", message: (error as Error).message });
    }
  }, [watchForPosition, handleProgress]);

  const loadLastSleepEntry = useCallback(async () => {
    const apiResponse = await getLastSleepEntry();
    if (apiResponse.success) {
      setStatus({ type: "idle", entryData: apiResponse.data });
    } else {
      console.error(apiResponse);
      setStatus({ type: "error", message: apiResponse.message });
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    loadLastSleepEntry();
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

type LocatingProgressProps = {
  info: LocatingInfo;
  children: React.ReactNode;
};

const LocatingProgress: React.FC<LocatingProgressProps> = ({
  info,
  children,
}) => {
  const elapsedSeconds = Math.floor((Date.now() - info.startTime) / 1000);

  return (
    <div>
      <div className="d-flex mb-2 gap-2 align-items-center">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Getting location...</span>
      </div>
      <div className="small text-body-secondary">
        Elapsed: {elapsedSeconds}s | Attempts: {info.attempts}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
};

type StatusDisplayProps = {
  status: AppStatus;
};

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  switch (status.type) {
    case "loading":
      return <div>Getting last sleep log...</div>;

    case "idle":
      return <IdleDisplay entryData={status.entryData} />;

    case "locating":
      return (
        <LocatingProgress info={status.info}>
          <span className="text-body-secondary">
            Waiting for position data...
          </span>
        </LocatingProgress>
      );

    case "locatingTimestamp":
      return (
        <LocatingProgress info={status.info}>
          <span className="text-warning">
            Timestamp too old ({status.timestampAge}ms), retrying...
          </span>
        </LocatingProgress>
      );

    case "locatingAccuracy":
      return (
        <LocatingProgress info={status.info}>
          <span className="text-warning">
            Accuracy: {Math.round(status.currentAccuracy)}m (need &lt;
            {REQUIRED_ACCURACY}m)
          </span>
        </LocatingProgress>
      );

    case "locatingError":
      return (
        <LocatingProgress info={status.info}>
          <span className="text-danger">{status.message}</span>
        </LocatingProgress>
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
