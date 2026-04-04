"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/actions/auth";

const PALETTE = [
  { bg: "#0C7C59", text: "#ffffff" }, // emerald
  { bg: "#0E6B8C", text: "#ffffff" }, // ocean
  { bg: "#6B3FA0", text: "#ffffff" }, // violet
  { bg: "#C05621", text: "#ffffff" }, // burnt orange
  { bg: "#2D6A4F", text: "#ffffff" }, // forest
  { bg: "#1A5C8A", text: "#ffffff" }, // steel blue
  { bg: "#9B2C5E", text: "#ffffff" }, // berry
  { bg: "#7C5E2A", text: "#ffffff" }, // amber
  { bg: "#374785", text: "#ffffff" }, // indigo
  { bg: "#8B4513", text: "#ffffff" }, // sienna
  { bg: "#2C6E6E", text: "#ffffff" }, // teal
  { bg: "#6B4E3D", text: "#ffffff" }, // cocoa
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  return PALETTE[hashName(name) % PALETTE.length];
}

// ─── Internal Badge Component ────────────────────────────────
function AvatarBadge({ name, size }: { name: string; size: "sm" | "md" }) {
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <span
      className={`rounded-full flex items-center justify-center font-display font-semibold leading-none select-none shrink-0 ring-2 ring-white/20 ${
        size === "sm" ? "w-9 h-9 text-[13px]" : "w-10 h-10 text-sm"
      }`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {initials}
    </span>
  );
}

// ─── Header ──────────────────────────────────────────────────
interface Props {
  userName: string;
}

export function Header({ userName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
      <span className="font-display text-base font-semibold text-text tracking-wide">
        DailyRecap
      </span>

      {/* Profile trigger */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-2.5 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-lg"
        >
          <span className="transition-transform duration-150">
            <AvatarBadge name={userName} size="sm" />
          </span>

          <span className="hidden sm:block text-sm font-sans text-muted max-w-[120px] truncate">
            {userName}
          </span>

          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-lg shadow-lg shadow-black/5 z-50 overflow-hidden animate-dropdown-enter">
            {/* User info */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <AvatarBadge name={userName} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-sans text-text font-medium truncate">
                  {userName}
                </p>
              </div>
            </div>

            {/* Menu */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full text-left px-4 py-3 text-xs font-sans text-muted hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
