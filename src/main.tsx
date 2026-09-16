import { createRoot } from "react-dom/client";
import App from "./App";
import { installTypingGuard } from "./ensureTyping";
import "./styles.css";

installTypingGuard();
createRoot(document.getElementById("root")!).render(<App />);
