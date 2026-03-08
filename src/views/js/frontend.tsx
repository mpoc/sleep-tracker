import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { NotificationFeedback } from "./components/NotificationFeedback.tsx";
import { NotificationList } from "./components/NotificationList.tsx";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

for (const [rel, href] of [
  ["manifest", "/manifest.webmanifest"],
  ["apple-touch-icon", "/apple-touch-icon.png"],
] as const) {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

const getPage = () => {
  if (window.location.pathname === "/notifications") {
    return <NotificationList />;
  }
  if (window.location.pathname === "/notification-feedback") {
    return <NotificationFeedback />;
  }
  return <App />;
};

document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  const root = createRoot(rootElement);
  root.render(getPage());
});
