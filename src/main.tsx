import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const bp = import.meta.env.VITE_BASE_PATH ?? "/";
const basename =
  bp === "/" || bp === "" ? undefined : bp.replace(/\/+$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
