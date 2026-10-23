import { useState } from "react";

type PanelTab = "terminal" | "problems" | "output";

interface BottomPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const PLACEHOLDER: Record<PanelTab, string> = {
  terminal: "Terminal stub — shell integration will land in a later pass.",
  problems: "No problems detected in the workspace.",
  output: "[SmartIDE] Ready.\n[SmartIDE] AI providers: configure keys in Settings.",
};

export function BottomPanel({ collapsed, onToggle }: BottomPanelProps) {
  const [tab, setTab] = useState<PanelTab>("terminal");

  return (
    <section className="bottom-panel" data-collapsed={collapsed} aria-label="Panel">
      <div className="panel-tabs">
        {(["problems", "output", "terminal"] as PanelTab[]).map((id) => (
          <button
            key={id}
            type="button"
            className="panel-tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              if (collapsed) onToggle();
            }}
          >
            {id}
          </button>
        ))}
        <div className="panel-tabs__actions">
          <button type="button" className="btn btn-ghost" onClick={onToggle} aria-label="Toggle panel">
            {collapsed ? "▴" : "▾"}
          </button>
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
