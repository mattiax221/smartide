export interface DemoFile {
  id: string;
  name: string;
  language: string;
  path: string;
  content: string;
  kind: "file" | "folder";
  parent?: string;
}

export const DEMO_TREE: DemoFile[] = [
  { id: "src", name: "src", language: "", path: "src", content: "", kind: "folder" },
  {
    id: "main-tsx",
    name: "main.tsx",
    language: "typescript",
    path: "src/main.tsx",
    parent: "src",
    kind: "file",
    content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
  },
  {
    id: "app-tsx",
    name: "App.tsx",
    language: "typescript",
    path: "src/App.tsx",
    parent: "src",
    kind: "file",
    content: `import { IdeShell } from "./components/layout/IdeShell";

export default function App() {
  return <IdeShell />;
}
`,
  },
  {
    id: "lib-rs",
    name: "lib.rs",
    language: "rust",
    path: "src-tauri/src/lib.rs",
    kind: "file",
    content: `// Tauri commands for secure API key storage live here.
// See secrets.rs for AES-GCM + OS keyring hooks.
`,
  },
  {
    id: "readme",
    name: "README.md",
    language: "markdown",
    path: "README.md",
    kind: "file",
    content: `# SmartIDE

Desktop IDE scaffold — Tauri 2, React, Monaco.

Open files from the explorer, edit in Monaco, and configure AI provider keys in Settings.
`,
  },
];
