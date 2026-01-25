import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiResponse,
  GetLastSleepRouteResponse,
  LogSleepRouteResponse,
  ReplaceLastSleepRouteResponse,
} from "../../types";
import {
  getLastSleepEntry,
  replaceLastSleepEntry,
  submitSleepEntry,
} from "./api.js";
import { formatDuration, prettyObjectString, printPosition } from "./utils.js";

const REQUIRED_ACCURACY = 40;
const ALLOWED_TIMESTAMP_AGE = 5000;

type AppState = {
  text: string;
  logButtonDisabled: boolean;
  replaceButtonDisabled: boolean;
  entryData: GetLastSleepRouteResponse | null;
};

export const App = () => {
  const [state, setState] = useState<AppState>({
    text: "Getting last sleep log...",
    logButtonDisabled: true,
    replaceButtonDisabled: true,
    entryData: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setText = (text: string) => {
    setState((prev) => ({ ...prev, text }));
  };

  const disableButtons = useCallback(() => {
    setState((prev) => ({
      ...prev,
      logButtonDisabled: true,
      replaceButtonDisabled: true,
    }));
  }, []);

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

  const processSleepApiResponse = useCallback(
    (data: ApiResponse<LogSleepRouteResponse>) => {
      if (data.success) {
        const insertedRowText = prettyObjectString(data.data.updatedRow);
        setText(`Inserted row:<br>${insertedRowText}`);
      } else {
        console.error(data);
        setText(data.message);
      }
    },
    []
  );

  const processReplaceApiResponse = useCallback(
    (data: ApiResponse<ReplaceLastSleepRouteResponse>) => {
      if (data.success) {
        const insertedRowText = prettyObjectString(data.data.updatedRow);
        setText(`Replaced row:<br>${insertedRowText}`);
      } else {
        console.error(data);
        setText(data.message);
      }
    },
    []
  );

  const checkTimestamp = useCallback((position: GeolocationPosition) => {
    const timestampAge = Date.now() - position.timestamp;
    const timestampRecent = timestampAge < ALLOWED_TIMESTAMP_AGE;
    if (!timestampRecent) {
      setText(
        `Timestamp too old (${timestampAge} milliseconds)<br>Trying again...`
      );
    }
    return timestampRecent;
  }, []);

  const checkAccuracy = useCallback((position: GeolocationPosition) => {
    const accuracyAchieved = position.coords.accuracy < REQUIRED_ACCURACY;
    if (!accuracyAchieved) {
      setText(
        `Current accuracy: ${position.coords.accuracy} meters<br>Required accuracy: ${REQUIRED_ACCURACY} meters<br>Trying again...`
      );
    }
    return accuracyAchieved;
  }, []);

  const geolocationAvailable = useCallback(() => {
    if (navigator.geolocation) {
      return true;
    }
    console.log("Geolocation is not supported by this browser.");
    setText("Geolocation is not supported by this browser.");
    return false;
  }, []);

  const watchError = useCallback((err: GeolocationPositionError) => {
    const errorText = `ERROR(${err.code}): ${err.message}`;
    console.log(errorText);
    setText(errorText);
  }, []);

  const submitPosition = useCallback(
    (onSuccess: (position: GeolocationPosition) => Promise<void>) => {
      if (!geolocationAvailable()) {
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

        setText("Accuracy and timestamp OK, saving...");
        clearGeolocationWatch();

        await onSuccess(position);
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        onWatchSuccess,
        watchError,
        options
      );
    },
    [
      geolocationAvailable,
      checkTimestamp,
      checkAccuracy,
      clearGeolocationWatch,
      watchError,
    ]
  );

  const submitAndProcessSleepEntry = useCallback(
    async (position: GeolocationPosition) => {
      const response = await submitSleepEntry(position);
      processSleepApiResponse(response);
    },
    [processSleepApiResponse]
  );

  const submitAndProcessSleepEntryReplace = useCallback(
    async (position: GeolocationPosition) => {
      const response = await replaceLastSleepEntry(position);
      processReplaceApiResponse(response);
    },
    [processReplaceApiResponse]
  );

  const logSleepButtonAction = useCallback(() => {
    disableButtons();
    clearDisplayInterval();
    submitPosition(submitAndProcessSleepEntry);
  }, [
    disableButtons,
    clearDisplayInterval,
    submitPosition,
    submitAndProcessSleepEntry,
  ]);

  const replaceLastSleepButtonAction = useCallback(() => {
    disableButtons();
    clearDisplayInterval();
    submitPosition(submitAndProcessSleepEntryReplace);
  }, [
    disableButtons,
    clearDisplayInterval,
    submitPosition,
    submitAndProcessSleepEntryReplace,
  ]);

  const updateEntryDisplay = useCallback(
    (entryData: GetLastSleepRouteResponse) => {
      const [date, time] = entryData.lastSleepEntry["UTC time"].split(" ");
      const formattedUTCDate = `${date}T${time}Z`;

      const timeDiff = Date.now() - new Date(formattedUTCDate).getTime();

      const lastSleepEntryIsStop = !!entryData.lastSleepEntry.Duration;

      const newText = `
      <div>
        ${lastSleepEntryIsStop ? "🌞 Awake" : "😴 Asleep"} for ${formatDuration(timeDiff)}
      </div>
      <br>
      <div>
        Last sleep entry:
        <br>
        ${prettyObjectString(entryData.lastSleepEntry)}
      </div>
      <br>
      <div>
        Sleep entries in total: ${entryData.numberOfSleepEntries}
      </div>
    `;
      setText(newText);
    },
    []
  );

  const startEntryDisplay = useCallback(
    (entryData: GetLastSleepRouteResponse) => {
      updateEntryDisplay(entryData);

      clearDisplayInterval();
      const SECOND = 1000;
      intervalRef.current = setInterval(
        () => updateEntryDisplay(entryData),
        SECOND
      );
    },
    [updateEntryDisplay, clearDisplayInterval]
  );

  const showSleepEntry = useCallback(
    (entryData: GetLastSleepRouteResponse) => {
      const lastSleepEntryIsStop = !!entryData.lastSleepEntry.Duration;

      setState((prev) => ({
        ...prev,
        logButtonDisabled: false,
        replaceButtonDisabled: lastSleepEntryIsStop,
        entryData,
      }));

      startEntryDisplay(entryData);
    },
    [startEntryDisplay]
  );

  const loadLastSleepEntry = useCallback(async () => {
    const apiResponse = await getLastSleepEntry();
    if (apiResponse.success) {
      const lastEntryData = apiResponse.data;
      showSleepEntry(lastEntryData);
    } else {
      console.error(apiResponse);
      setText(apiResponse.message);
    }
  }, [showSleepEntry]);

  // Initial load effect
  useEffect(() => {
    loadLastSleepEntry();

    // Cleanup on unmount
    return () => {
      clearDisplayInterval();
      clearGeolocationWatch();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="m-1">
      <LayoutTable
        logButtonDisabled={state.logButtonDisabled}
        onLogSleep={logSleepButtonAction}
        onReplaceSleep={replaceLastSleepButtonAction}
        replaceButtonDisabled={state.replaceButtonDisabled}
        text={state.text}
      />
    </div>
  );
};

type LayoutTableProps = {
  logButtonDisabled: boolean;
  replaceButtonDisabled: boolean;
  text: string;
  onLogSleep: () => void;
  onReplaceSleep: () => void;
};

const LayoutTable: React.FC<LayoutTableProps> = ({
  logButtonDisabled,
  replaceButtonDisabled,
  text,
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
          <Text text={text} />
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
    id="logSleepButton"
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
    id="replaceConfirmationButton"
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
          <h5 className="modal-title" id="confirmationModalLabel">
            Confirm replace
          </h5>
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
            id="replaceLastSleepButton"
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

type TextProps = {
  text: string;
};

const Text: React.FC<TextProps> = ({ text }) => (
  <div dangerouslySetInnerHTML={{ __html: text }} id="text" />
);
