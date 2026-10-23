import type { ReactNode } from "react";
import {
  IconExtensions,
  IconFiles,
  IconGit,
  IconSearch,
  IconSettings,
  IconSpark,
} from "../icons";
import { Tooltip } from "../ui";
import type { ActivityView } from "./ActivityView";

export type { ActivityView };

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
      <div className="activity-bar__brand" title="SmartIDE" aria-label="SmartIDE">
        S
      </div>
      {ITEMS.map((item) => (
        <Tooltip key={item.id} label={item.label}>
          <button
            type="button"
            className="activity-btn"
            aria-label={item.label}
            aria-pressed={active === item.id}
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
          </button>
        </Tooltip>
      ))}
      <Tooltip label="AI Chat">
        <button
          type="button"
          className="activity-btn"
          aria-label="AI Chat"
          aria-pressed={chatOpen}
          onClick={onToggleChat}
        >
          <IconSpark />
        </button>
      </Tooltip>
      <div className="activity-bar__spacer" />
      <Tooltip label="Settings">
        <button
          type="button"
          className="activity-btn"
          aria-label="Settings"
          aria-pressed={active === "settings"}
          onClick={() => onSelect("settings")}
        >
          <IconSettings />
        </button>
      </Tooltip>
    </nav>
  );
}
