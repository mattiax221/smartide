import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "right" | "top" | "bottom" | "left";
}

interface Pos {
  top: number;
  left: number;
}

export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    let top = r.top;
    let left = r.left;
    switch (side) {
      case "right":
        top = r.top + r.height / 2;
        left = r.right + gap;
        break;
      case "left":
        top = r.top + r.height / 2;
        left = r.left - gap;
        break;
      case "top":
        top = r.top - gap;
        left = r.left + r.width / 2;
        break;
      case "bottom":
        top = r.bottom + gap;
        left = r.left + r.width / 2;
        break;
    }
    // Keep inside viewport
    const pad = 6;
    top = Math.min(Math.max(pad, top), window.innerHeight - pad);
    left = Math.min(Math.max(pad, left), window.innerWidth - pad);
    setPos({ top, left });
  }, [side]);

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place]);

  return (
    <span
      ref={anchorRef}
      className="ui-tooltip-anchor"
      onMouseEnter={() => {
        place();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        place();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && label
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              className={`ui-tooltip-bubble ui-tooltip-bubble--${side}`}
              style={{ top: pos.top, left: pos.left }}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
