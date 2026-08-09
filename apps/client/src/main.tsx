import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./ui/styles/tokens.css";
import "./ui/styles/primitives.css";
import "./theme/theme.css";
import "./styles.css";
import "./ui/styles/shell.css";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error('Root element "#root" was not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
