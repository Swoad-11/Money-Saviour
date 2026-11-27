import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/ui/tokens.css";
import { App } from "./App";
import { watchSystemTheme } from "@/state/theme";

watchSystemTheme();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
