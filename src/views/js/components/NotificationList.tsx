import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  feedback?: string;
  feedbackMessage?: string;
  feedbackGivenAt?: string;
};

const getSectionLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - notifDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined });
};

const groupBySection = (notifications: Notification[]) => {
  const sections: { label: string; items: Notification[] }[] = [];
  for (const n of notifications) {
    const label = getSectionLabel(new Date(n.sentAt));
    const last = sections[sections.length - 1];
    if (last && last.label === label) {
      last.items.push(n);
    } else {
      sections.push({ label, items: [n] });
    }
  }
  return sections;
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

  const sections = groupBySection(notifications);

  return (
    <div className="px-3 py-3" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h5 className="mb-3 text-body-secondary">
        Notifications ({notifications.length})
      </h5>
      {notifications.length === 0 && (
        <p className="text-body-secondary">No notifications yet.</p>
      )}
      {sections.map((section) => (
        <div key={section.label} className="mb-3">
          <h6 className="text-body-tertiary mb-2" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {section.label}
          </h6>
          <div className="d-flex flex-column gap-2">
            {section.items.map((n) => (
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
                  {n.feedbackMessage && (
                    <p
                      className="card-text mb-1 fst-italic text-body-tertiary"
                      style={{ fontSize: "0.8rem" }}
                    >
                      "{n.feedbackMessage}"
                    </p>
                  )}
                  <small
                    className="text-body-tertiary"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {new Date(n.sentAt)
                      .toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
