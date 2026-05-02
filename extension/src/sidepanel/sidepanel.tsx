import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SidePanel from "./SidePanelView";
import "../popup/popup.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);
