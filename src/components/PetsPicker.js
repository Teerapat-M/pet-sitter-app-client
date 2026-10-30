"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Minus, PawPrint, Plus } from "lucide-react";
import { FALLBACK_PET_TYPES, formatPetsSummary } from "@/lib/petSearch";

export default function PetsPicker({
  types = FALLBACK_PET_TYPES,
  counts = {},
  onChange,
  placeholder = "Select pets",
}) {
  const dialogId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const summary = formatPetsSummary(counts, types);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function setCount(id, next) {
    const value = Math.max(0, next);
    onChange?.({
      ...counts,
      [id]: value,
    });
  }

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-2 rounded-full px-4 text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label="Pets"
        onClick={() => setOpen((current) => !current)}
      >
        <PawPrint className="size-4 shrink-0 text-primary" aria-hidden />
        <span
          className={`min-w-0 flex-1 truncate text-body-2 ${
            summary ? "text-ink-900" : "text-ink-400"
          }`}
        >
          {summary || placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Choose pets by type"
          className="absolute top-full right-0 left-0 z-50 mt-2 w-full min-w-56 rounded-card border border-line bg-surface p-3 shadow-dropdown lg:left-auto lg:w-72"
        >
          <ul className="flex flex-col gap-2">
            {types.map((type) => {
              const count = Number(counts[type.id]) || 0;
              return (
                <li
                  key={type.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-1 py-1"
                >
                  <span className="text-body-2 font-semibold text-ink-900">
                    {type.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-900 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Decrease ${type.plural}`}
                      disabled={count <= 0}
                      onClick={() => setCount(type.id, count - 1)}
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span
                      className="w-6 text-center text-body-2 font-bold text-ink-900"
                      role="spinbutton"
                      aria-valuemin={0}
                      aria-valuenow={count}
                      aria-label={`${type.label} count`}
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-900 hover:bg-primary-50"
                      aria-label={`Increase ${type.plural}`}
                      onClick={() => setCount(type.id, count + 1)}
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
