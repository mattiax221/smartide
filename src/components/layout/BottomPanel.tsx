import { useCallback, useRef } from "react";
import { Button } from "../ui";

type PanelTab = "terminal" | "problems" | "output";

interface BottomPanelProps {
  collapsed: boolean;
  height: number;
  tab: PanelTab;
  onToggle: () => void;
  onTab: (tab: PanelTab) => void;
  onResize: (height: number) => void;
}

const PLACEHOLDER: Record<PanelTab, string> = {
  terminal: "Terminal stub — PTY integration lands in Fase G.",
  problems: "No problems detected in the workspace.",
  output: "[SmartIDE] Ready.\n[SmartIDE] Configure AI keys in Settings · chat via spark icon.",
};

export function BottomPanel({
  collapsed,
  height,
  tab,
  onToggle,
  onTab,
  onResize,
}: BottomPanelProps) {
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - ev.clientY;
        onResize(dragRef.current.startH + delta);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [height, onResize],
  );

  return (
    <section
      className="bottom-panel"
      data-collapsed={collapsed}
      aria-label="Panel"
      style={collapsed ? undefined : { height }}
    >
      {!collapsed && (
        <div
          className="panel-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize panel"
          onPointerDown={onPointerDown}
        />
      )}
      <div className="panel-tabs">
        {(["problems", "output", "terminal"] as PanelTab[]).map((id) => (
          <button
            key={id}
            type="button"
            className="panel-tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
          >
            {id}
          </button>
        ))}
        <div className="panel-tabs__actions">
          <Button variant="subtle" onClick={onToggle} aria-label="Toggle panel">
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className={`panel-body${tab === "problems" ? " panel-body--empty" : ""}`}>
          {PLACEHOLDER[tab]}
        </div>
      )}
    </section>
  );
}
