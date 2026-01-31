import type React from "react";
import { usePushNotifications } from "../hooks/usePushNotifications.js";

export const PushNotificationToggle: React.FC = () => {
  const { status, isEnabling, enableNotifications } = usePushNotifications();

  // Show nothing for these states
  if (status === "loading" || status === "subscribed") {
    return null;
  }

  if (status === "unsupported") {
    return (
      <div className="small text-secondary">
        Push notifications not supported
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="small text-warning">
        Notifications blocked. Enable in browser settings.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="small text-danger">
        Failed to enable notifications.
      </div>
    );
  }

  // status === "prompt"
  return (
    <button
      className="btn btn-secondary btn-lg"
      disabled={isEnabling}
      onClick={enableNotifications}
      type="button"
    >
      {isEnabling ? (
        <>
          <span
            aria-hidden="true"
            className="spinner-border spinner-border-sm me-2"
            role="status"
          />
          Enabling notifications...
        </>
      ) : (
        "Enable notifications"
      )}
    </button>
  );
};
