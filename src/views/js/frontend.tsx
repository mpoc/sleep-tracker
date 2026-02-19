import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { NotificationFeedback } from "./components/NotificationFeedback.tsx";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

const getPage = () => {
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
