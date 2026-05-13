import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Popup from "./PopupView";
import "./popup.css";

import "virtual:click-to-component/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
