import { api } from "../../lib/bindings";

export function TitleBar() {
  return (
    <header
      className="flex h-8 items-center justify-between border-b border-hacker-border px-4"
      data-tauri-drag-region
    >
      <div
        className="flex items-center gap-2 text-xs font-bold tracking-widest"
        style={{ color: "var(--accent)" }}
        data-tauri-drag-region
      >
        SNATCH
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => void api.window.minimize()}
          className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-text"
          aria-label="Minimize"
        >
          &#x2500;
        </button>
        <button
          onClick={() => void api.window.maximize()}
          className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-text"
          aria-label="Maximize"
        >
          &#x25A1;
        </button>
        <button
          onClick={() => void api.window.close()}
          className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-red"
          aria-label="Close"
        >
          &#x2715;
        </button>
      </div>
    </header>
  );
}
