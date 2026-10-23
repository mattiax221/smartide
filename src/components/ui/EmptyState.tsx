import type { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, body, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      {icon ? <div className="ui-empty__icon" aria-hidden>{icon}</div> : null}
      <h3 className="ui-empty__title">{title}</h3>
      <p className="ui-empty__body">{body}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
