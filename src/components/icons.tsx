type IconProps = { title?: string };

export function IconFiles({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <path d="M4 4h7l2 2h7v14H4V4z" />
      <path d="M4 10h16" />
    </svg>
  );
}

export function IconSearch({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export function IconGit({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M6 8v8M8 6h4a4 4 0 014 4" />
    </svg>
  );
}

export function IconExtensions({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 3h3v3h-3v-3zm4-3h3v7h-3v-7z" />
    </svg>
  );
}

export function IconSettings({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconFolder({ title }: IconProps) {
  return (
    <svg className="tree-item__icon tree-item__icon--folder" viewBox="0 0 16 16" fill="currentColor" aria-hidden={!title}>
      {title ? <title>{title}</title> : null}
      <path d="M1.5 3h4l1 1.5H14.5v8.5h-13V3z" />
    </svg>
  );
}

export function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className ?? "tree-item__icon"} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M3 1.5h6l4 4V14.5H3V1.5zm6 0v4h4" />
    </svg>
  );
}
