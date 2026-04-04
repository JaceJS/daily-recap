import { TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

export function Textarea({ mono, className = "", ...props }: Props) {
  return (
    <textarea
      className={`w-full px-4 py-3 text-sm bg-surface border border-border text-text rounded-[2px] outline-none transition-all duration-200 placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/15 resize-none ${mono ? "font-mono tracking-[0.02em] leading-relaxed" : "font-sans"} ${className}`}
      {...props}
    />
  );
}
