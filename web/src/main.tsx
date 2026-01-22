import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme from localStorage before React hydrates to prevent flash
const storedSettings = localStorage.getItem("mmg-wasm-settings");
if (storedSettings) {
  try {
    const { state } = JSON.parse(storedSettings);
    if (state?.theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch {
    // Ignore parse errors
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
