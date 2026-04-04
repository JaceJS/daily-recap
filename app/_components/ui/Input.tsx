import { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ mono, className = "", ...props }: Props) {
  return (
    <input
      className={`w-full px-4 py-3 text-sm bg-surface border border-border text-text rounded-[2px] outline-none transition-all duration-200 placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 ${mono ? "font-mono tracking-[0.05em]" : "font-sans"} ${className}`}
      {...props}
    />
  );
}
