import { useEffect, useState } from "react";

type NotificationData = { title: string; body: string; feedback?: string };

export const NotificationFeedback = () => {
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );

  const id = new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!id) {
      return;
    }
    fetch(`/api/notifications/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNotification(data);
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) {
    return <div className="m-3">Missing notification id.</div>;
  }

  const sendFeedback = async (feedback: string) => {
    setNotification((prev) => (prev ? { ...prev, feedback } : prev));
    try {
      await fetch("/api/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedback }),
      });
    } catch (e) {
      console.error("Failed to send feedback:", e);
    }
  };

  return (
    <div className="d-flex justify-content-center flex-column gap-3 px-3" style={{ minHeight: "100dvh" }}>
      {notification && (
        <div className="card mb-2">
          <div className="card-body">
            <h5 className="card-title">{notification.title}</h5>
            <p
              className="card-text mb-0 text-body-secondary"
              style={{ whiteSpace: "pre-line" }}
            >
              {notification.body}
            </p>
          </div>
        </div>
      )}
      {notification?.feedback ? (
        <div className="text-center text-body-secondary">
          You rated this{" "}
          {notification.feedback === "useful" ? "👍 useful" : "👎 not useful"}
        </div>
      ) : (
        <>
          <button
            className="btn btn-success w-100 py-4"
            onClick={() => sendFeedback("useful")}
            style={{ fontSize: "1.75rem" }}
            type="button"
          >
            👍 Useful
          </button>
          <button
            className="btn btn-danger w-100 py-4"
            onClick={() => sendFeedback("not-useful")}
            style={{ fontSize: "1.75rem" }}
            type="button"
          >
            👎 Not useful
          </button>
        </>
      )}
    </div>
  );
};
