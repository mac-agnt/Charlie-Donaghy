import { createRoot } from "react-dom/client";
// First, so the per-tab stylesheets (canvas.css, signatures.css) load after it and can build on it.
import "./styles/workspace.css";
import App from "./App";
import "./styles/base.css";
import "./styles/pulse.css";
import "./styles/interactions.css";

createRoot(document.getElementById("root")!).render(<App />);
