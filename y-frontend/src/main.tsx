import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { ensurePdfFontsLoaded } from "@/utils/pdfFonts";
import App from "./App.tsx";

void ensurePdfFontsLoaded();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
