import type { ReactNode } from "react";
import {
  IconExtensions,
  IconFiles,
  IconGit,
  IconSearch,
  IconSettings,
  IconSpark,
} from "../icons";

export type ActivityView = "explorer" | "search" | "git" | "extensions" | "settings";

interface ActivityBarProps {
  active: ActivityView;
  chatOpen: boolean;
  onSelect: (view: ActivityView) => void;
  onToggleChat: () => void;
}

const ITEMS: { id: ActivityView; label: string; icon: ReactNode }[] = [
  { id: "explorer", label: "Explorer", icon: <IconFiles /> },
  { id: "search", label: "Search", icon: <IconSearch /> },
  { id: "git", label: "Source Control", icon: <IconGit /> },
  { id: "extensions", label: "Extensions", icon: <IconExtensions /> },
];

export function ActivityBar({ active, chatOpen, onSelect, onToggleChat }: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Activity Bar">
      <div className="activity-bar__brand" title="SmartIDE" aria-hidden>
        S
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="activity-btn"
          title={item.label}
          aria-label={item.label}
          aria-pressed={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.icon}
        </button>
      ))}
      <button
        type="button"
        className="activity-btn"
        title="AI Chat"
        aria-label="AI Chat"
        aria-pressed={chatOpen}
        onClick={onToggleChat}
      >
        <IconSpark />
      </button>
      <div className="activity-bar__spacer" />
      <button
        type="button"
        className="activity-btn"
        title="Settings"
        aria-label="Settings"
        aria-pressed={active === "settings"}
        onClick={() => onSelect("settings")}
      >
        <IconSettings />
      </button>
    </nav>
  );
}
