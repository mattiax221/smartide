import Editor from "@monaco-editor/react";

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
        theme="vs-dark"
        language={language || "plaintext"}
        value={value}
        path={path}
        onChange={(next) => onChange(next ?? "")}
        options={{
          fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: "line",
          padding: { top: 8 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
        loading={<div className="editor-welcome">Loading editor…</div>}
      />
    </div>
  );
}
