import Editor, { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

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
      "focusBorder": "#f5c51880",
      "scrollbarSlider.background": "#f5c51833",
      "scrollbarSlider.hoverBackground": "#f5c51855",
    },
  });
}

loader.init().then((monaco) => {
  defineTheme(monaco);
});

interface MonacoPaneProps {
  path: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export function MonacoPane({ path, language, value, onChange }: MonacoPaneProps) {
  return (
    <div className="editor-pane" data-path={path}>
      <Editor
        theme={THEME_NAME}
        language={language || "plaintext"}
        value={value}
        path={path}
        beforeMount={defineTheme}
        onChange={(next) => onChange(next ?? "")}
        options={
          {
            fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            renderLineHighlight: "line",
            padding: { top: 10 },
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
