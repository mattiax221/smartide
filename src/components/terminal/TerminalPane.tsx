import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import {
  onTerminalData,
  terminalCreate,
  terminalKill,
  terminalResize,
  terminalWrite,
} from "../../lib/terminal";
import { Button } from "../ui";

interface TerminalPaneProps {
  active: boolean;
  onError: (err: unknown) => void;
}

interface TermSession {
  id: string;
  label: string;
}

export function TerminalPane({ active, onError }: TerminalPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const activeId = useRef<string | null>(null);
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!hostRef.current || termRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      fontSize: 12,
      theme: {
        background: "#0a0a0c",
        foreground: "#e8e4d9",
        cursor: "#f5c518",
        selectionBackground: "#f5c51844",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    term.onData((data) => {
      if (activeId.current) void terminalWrite(activeId.current, data);
    });

    let un: (() => void) | undefined;
    void onTerminalData((payload) => {
      if (payload.id === activeId.current) term.write(payload.data);
    }).then((fn) => {
      un = fn;
    });

    const onResize = () => {
      fit.fit();
      if (activeId.current) {
        void terminalResize(activeId.current, term.cols, term.rows);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      un?.();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) {
      fitRef.current?.fit();
      if (activeId.current && termRef.current) {
        void terminalResize(activeId.current, termRef.current.cols, termRef.current.rows);
      }
    }
  }, [active]);

  async function newSession() {
    try {
      const term = termRef.current;
      if (!term) return;
      fitRef.current?.fit();
      const id = await terminalCreate(term.cols, term.rows);
      const label = `Term ${sessions.length + 1}`;
      setSessions((s) => [...s, { id, label }]);
      setCurrent(id);
      activeId.current = id;
      term.reset();
      term.focus();
    } catch (e) {
      onError(e);
    }
  }

  async function switchTo(id: string) {
    setCurrent(id);
    activeId.current = id;
    termRef.current?.reset();
    termRef.current?.writeln("\x1b[90m(switched session — output continues from PTY)\x1b[0m");
    if (termRef.current) {
      await terminalResize(id, termRef.current.cols, termRef.current.rows);
    }
    termRef.current?.focus();
  }

  async function killCurrent() {
    if (!current) return;
    try {
      await terminalKill(current);
      setSessions((s) => s.filter((x) => x.id !== current));
      const next = sessions.find((x) => x.id !== current);
      setCurrent(next?.id ?? null);
      activeId.current = next?.id ?? null;
      termRef.current?.reset();
    } catch (e) {
      onError(e);
    }
  }

  function clearTerm() {
    termRef.current?.clear();
  }

  useEffect(() => {
    if (active && sessions.length === 0) {
      void newSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="terminal-pane">
      <div className="terminal-pane__toolbar">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="panel-tab"
            aria-selected={s.id === current}
            onClick={() => void switchTo(s.id)}
          >
            {s.label}
          </button>
        ))}
        <div className="panel-tabs__actions" style={{ display: "flex", gap: 6 }}>
          <Button variant="subtle" onClick={() => void newSession()}>
            +
          </Button>
          <Button variant="subtle" onClick={clearTerm}>
            Clear
          </Button>
          <Button variant="subtle" onClick={() => void killCurrent()} disabled={!current}>
            Kill
          </Button>
        </div>
      </div>
      <div ref={hostRef} className="terminal-pane__xterm" />
    </div>
  );
}
