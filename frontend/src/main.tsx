import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Cotagraph</h1>
      <p>Transparência parlamentar brasileira</p>
      <p style={{ color: "#666" }}>Frontend scaffold — graph visualization coming soon.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
