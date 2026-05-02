import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import {
  applyAppearanceSettings,
  readStoredAppearance,
} from "@/lib/appearance";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const appearance = readStoredAppearance();
applyAppearanceSettings(appearance.theme, appearance.typography);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
);
