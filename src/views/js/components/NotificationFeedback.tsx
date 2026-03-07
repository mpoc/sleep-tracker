import { useEffect, useState } from "react";

type NotificationData = { title: string; body: string; feedback?: string; feedbackMessage?: string };

export const NotificationFeedback = () => {
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [messageSaved, setMessageSaved] = useState(false);

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
          if (data.feedbackMessage) {
            setFeedbackMessage(data.feedbackMessage);
          }
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) {
    return <div className="m-3">Missing notification id.</div>;
  }

  const sendFeedback = async (feedback: string) => {
    setNotification((prev) => (prev ? { ...prev, feedback, feedbackMessage: feedbackMessage || undefined } : prev));
    try {
      await fetch("/api/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedback, feedbackMessage: feedbackMessage || undefined }),
      });
    } catch (e) {
      console.error("Failed to send feedback:", e);
    }
  };

  const saveMessage = async () => {
    setNotification((prev) => (prev ? { ...prev, feedbackMessage: feedbackMessage || undefined } : prev));
    setMessageSaved(true);
    try {
      await fetch("/api/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, feedbackMessage: feedbackMessage || undefined }),
      });
    } catch (e) {
      console.error("Failed to save feedback message:", e);
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
      {notification?.feedback && (
        <div className="text-center text-body-secondary">
          You rated this{" "}
          {notification.feedback === "useful" ? "👍 useful" : "👎 not useful"}
        </div>
      )}
      {!notification?.feedback && (
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
      <textarea
        className="form-control"
        placeholder="Why? (optional)"
        rows={2}
        value={feedbackMessage}
        onChange={(e) => { setFeedbackMessage(e.target.value); setMessageSaved(false); }}
      />
      {notification?.feedback && (
        <button
          className="btn btn-primary w-100"
          onClick={saveMessage}
          disabled={messageSaved}
          type="button"
        >
          {messageSaved ? "Saved" : "Save message"}
        </button>
      )}
    </div>
  );
};
