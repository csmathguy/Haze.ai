import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { App } from "./app/App.js";
import { createKnowledgeTheme } from "./theme/index.js";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <KnowledgeRoot />
  </StrictMode>
);

function KnowledgeRoot() {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.muiColorScheme = mode;
  }, [mode]);

  return (
    <ThemeProvider theme={createKnowledgeTheme(mode)}>
      <CssBaseline />
      <App colorMode={mode} onColorModeChange={setMode} />
    </ThemeProvider>
  );
}
