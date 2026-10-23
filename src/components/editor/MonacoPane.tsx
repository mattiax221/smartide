import Editor, { loader, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import type { SettingsUiState } from "../../state/types";

const THEME_NAME = "smartide-dark";

function defineTheme(monaco: typeof import("monaco-editor")) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e6a5e", fontStyle: "italic" },
      { token: "string", foreground: "e8c96a" },
      { token: "keyword", foreground: "f5c518" },
      { token: "number", foreground: "d4a84b" },
      { token: "type", foreground: "e8d9a0" },
    ],
    colors: {
      "editor.background": "#0a0a0ccc",
      "editor.foreground": "#e8e4d9",
      "editorLineNumber.foreground": "#5c584c",
      "editorLineNumber.activeForeground": "#f5c518",
      "editorCursor.foreground": "#f5c518",
      "editor.selectionBackground": "#f5c51833",
      "editor.inactiveSelectionBackground": "#f5c5181a",
      "editor.lineHighlightBackground": "#f5c5180f",
      "editorIndentGuide.background": "#ffffff10",
      "editorIndentGuide.activeBackground": "#f5c51840",
      "editorWidget.background": "#141416ee",
      "editorWidget.border": "#f5c51830",
      "input.background": "#00000080",
      focusBorder: "#f5c51880",
      "scrollbarSlider.background": "#f5c51833",
      "scrollbarSlider.hoverBackground": "#f5c51855",
    },
  });
}

loader.init().then((monaco) => {
  defineTheme(monaco);
});

export interface MonacoReveal {
  line: number;
  column?: number;
}

interface MonacoPaneProps {
  path: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
  settings: SettingsUiState;
  reveal?: MonacoReveal | null;
  findTrigger?: number;
  replaceTrigger?: number;
  onEditorReady?: (ed: editor.IStandaloneCodeEditor) => void;
}

export function MonacoPane({
  path,
  language,
  value,
  onChange,
  settings,
  reveal,
  findTrigger,
  replaceTrigger,
  onEditorReady,
}: MonacoPaneProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;
    onEditorReady?.(ed);
  };

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !reveal) return;
    const line = Math.max(1, reveal.line);
    const col = Math.max(1, reveal.column ?? 1);
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: col });
    ed.focus();
  }, [reveal, path]);

  useEffect(() => {
    if (!findTrigger) return;
    editorRef.current?.getAction("actions.find")?.run();
  }, [findTrigger]);

  useEffect(() => {
    if (!replaceTrigger) return;
    editorRef.current?.getAction("editor.action.startFindReplaceAction")?.run();
  }, [replaceTrigger]);

  return (
    <div className="editor-pane" data-path={path}>
      <Editor
        theme={THEME_NAME}
        language={language || "plaintext"}
        value={value}
        path={path}
        beforeMount={defineTheme}
        onMount={handleMount}
        onChange={(next) => onChange(next ?? "")}
        options={
          {
            fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
            fontSize: settings.editorFontSize,
            lineHeight: Math.round(settings.editorFontSize * 1.55),
            minimap: { enabled: settings.minimap, scale: 1 },
            wordWrap: settings.wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: settings.tabSize,
            renderLineHighlight: "line",
            padding: { top: 10 },
            find: { addExtraSpaceOnTop: false },
            multiCursorModifier: "alt",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            roundedSelection: true,
          } satisfies editor.IStandaloneEditorConstructionOptions
        }
        loading={<div className="editor-welcome">Loading editor…</div>}
      />
    </div>
  );
}
