"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  id,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-3 text-sm bg-surface border border-border text-text rounded-[2px] outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/15 font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
      >
        <span className={selectedOption ? "truncate" : "text-muted truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 shrink-0 ml-2 transition-transform text-muted ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-[2px] shadow-lg flex flex-col max-h-60 overflow-hidden outline-none">
          <div className="p-2 border-b border-border sticky top-0 bg-surface z-10 shrink-0">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 text-sm bg-background border border-border text-text rounded-[2px] outline-none transition-all duration-200 focus:border-accent focus:ring-1 focus:ring-accent font-sans"
            />
          </div>
          <div className="overflow-y-auto w-full">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted text-center font-sans">
                No results found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors font-sans ${
                    value === option.value
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-text"
                  }`}
                >
                  <span className="block truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
