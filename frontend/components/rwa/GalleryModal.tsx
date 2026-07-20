"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

// Generic gallery picker modal (Higgsfield-style): title, search, optional category tabs,
// and a responsive grid of selectable tiles. Parent supplies the tile renderer.
export function GalleryModal<T>({
  open,
  title,
  items,
  selectedId,
  getId,
  getSearchText,
  categories,
  getCategory,
  columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  renderTile,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  items: T[];
  selectedId: string;
  getId: (t: T) => string;
  getSearchText: (t: T) => string;
  categories?: string[];
  getCategory?: (t: T) => string;
  columns?: string;
  renderTile: (t: T, selected: boolean, onSelect: () => void) => ReactNode;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const titleId = useId();
  const searchId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCat("All");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      dialogRef.current?.querySelector<HTMLElement>(focusSelector)?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusSelector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const frame = window.requestAnimationFrame(focusFirst);
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = items.filter((it) => {
    const catOk = !categories || cat === "All" || (getCategory?.(it) ?? "") === cat;
    const searchOk = !q || getSearchText(it).toLowerCase().includes(q);
    return catOk && searchOk;
  });

  const pick = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line2 bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line p-4">
          <h3 id={titleId} className="text-lg font-bold text-fg">{title}</h3>
          <p id={descriptionId} className="sr-only">Search, filter and select one item from this gallery.</p>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor={searchId} className="sr-only">Search {title}</label>
            <input
              id={searchId}
              name="gallery-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-40 rounded-full border border-line2 bg-bg2 px-3 py-1.5 text-sm text-fg placeholder:text-fgMuted focus:border-fg focus:outline-none sm:w-56"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 text-fg hover:bg-bg2"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        {/* Category tabs */}
        {categories ? (
          <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3" role="tablist" aria-label={`Filter ${title}`}>
            {["All", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  cat === c ? "bg-fg text-bg" : "bg-bg2 text-fgSoft hover:bg-bg3",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        {/* Grid */}
        <div className="max-h-[64vh] overflow-y-auto p-4">
          {filtered.length ? (
            <div className={["grid gap-3", columns].join(" ")}>
              {filtered.map((it) => {
                const id = getId(it);
                return <div key={id}>{renderTile(it, id === selectedId, () => pick(id))}</div>;
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-fgMuted">No results.</div>
          )}
        </div>
      </div>
    </div>
  );
}
