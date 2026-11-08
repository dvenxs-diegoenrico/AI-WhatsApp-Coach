"use client";
import { useState } from "react";

/** Read-only text with a copy button (for the personal Shortcut link). */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-field">
      <label className="sr-only" htmlFor="copy-field">{label}</label>
      <input id="copy-field" readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* old browsers: the input is selectable */
          }
        }}
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
