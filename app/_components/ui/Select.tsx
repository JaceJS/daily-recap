import { SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export function Select({ placeholder, className = "", children, ...props }: Props) {
  return (
    <select
      className={`w-full px-4 py-3 text-sm bg-surface border border-border text-text rounded-[2px] outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/15 font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}
