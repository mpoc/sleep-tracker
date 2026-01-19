import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/static/sw.js");
}

document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
});
