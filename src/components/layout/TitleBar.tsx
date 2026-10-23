import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { Tooltip } from "../ui";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    void win.isMaximized().then(setMaximized);
    const un = win.onResized(() => {
      void win.isMaximized().then(setMaximized);
    });
    return () => {
      void un.then((f) => f());
    };
  }, []);

  async function minimize() {
    if (!isTauri()) return;
    await getCurrentWindow().minimize();
  }

  async function toggleMax() {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setMaximized(false);
    } else {
      await win.maximize();
      setMaximized(true);
    }
  }

  async function close() {
    if (!isTauri()) return;
    await getCurrentWindow().close();
  }

  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="title-bar__brand" data-tauri-drag-region>
        <span className="title-bar__mark" aria-hidden>
          S
        </span>
        <span className="title-bar__name" data-tauri-drag-region>
          SmartIDE
        </span>
      </div>
      <div className="title-bar__drag" data-tauri-drag-region />
      <div className="title-bar__controls">
        <Tooltip label="Minimize" side="bottom">
          <button type="button" className="title-bar__btn" aria-label="Minimize" onClick={() => void minimize()}>
            ─
          </button>
        </Tooltip>
        <Tooltip label={maximized ? "Restore" : "Maximize"} side="bottom">
          <button
            type="button"
            className="title-bar__btn"
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={() => void toggleMax()}
          >
            {maximized ? "❐" : "□"}
          </button>
        </Tooltip>
        <Tooltip label="Close" side="bottom">
          <button
            type="button"
            className="title-bar__btn title-bar__btn--close"
            aria-label="Close"
            onClick={() => void close()}
          >
            ×
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
