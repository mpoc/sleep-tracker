import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  feedback?: string;
  feedbackGivenAt?: string;
};

export const NotificationList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const apiKey = new URLSearchParams(window.location.search).get("apiKey");

  useEffect(() => {
    if (!apiKey) {
      return;
    }
    fetch(`/api/notifications/all?apiKey=${encodeURIComponent(apiKey)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNotifications(data.reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey]);

  if (!apiKey) {
    return <div className="m-3">Missing apiKey query param.</div>;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center vh-100 align-items-center">
        <div className="spinner-border text-secondary" />
      </div>
    );
  }

  return (
    <div className="px-3 py-3" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h5 className="mb-3 text-body-secondary">
        Notifications ({notifications.length})
      </h5>
      {notifications.length === 0 && (
        <p className="text-body-secondary">No notifications yet.</p>
      )}
      <div className="d-flex flex-column gap-2">
        {notifications.map((n) => (
          <a
            className="card text-decoration-none"
            href={`/notification-feedback?id=${encodeURIComponent(n.id)}`}
            key={n.id}
          >
            <div className="card-body px-3 py-2">
              <div className="d-flex justify-content-between mb-1 gap-2 align-items-center">
                <h6 className="card-title mb-0 text-truncate">{n.title}</h6>
                <span
                  className={`badge ${
                    n.feedback === "useful"
                      ? "bg-success"
                      : n.feedback === "not-useful"
                        ? "bg-danger"
                        : "bg-secondary"
                  }`}
                >
                  {n.feedback === "useful"
                    ? "👍"
                    : n.feedback === "not-useful"
                      ? "👎"
                      : "—"}
                </span>
              </div>
              <p
                className="card-text mb-1 text-body-secondary"
                style={{
                  whiteSpace: "pre-line",
                  fontSize: "0.85rem",
                  lineHeight: 1.4,
                }}
              >
                {n.body}
              </p>
              <small
                className="text-body-tertiary"
                style={{ fontSize: "0.75rem" }}
              >
                {new Date(n.sentAt)
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " ")}
              </small>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
