/** Filled in by the UI slice (steps 10-12); the scaffold only has to mount. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyView } from "@tbc-gear-prio/core/view";

const container = document.getElementById("root");
if (!container) throw new Error("no #root element");

createRoot(container).render(
  <StrictMode>
    <p>tbc gear prio {typeof applyView}</p>
  </StrictMode>
);
