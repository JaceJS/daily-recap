import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ loading, disabled, children, className = "", ...props }: Props) {
  return (
    <button
      disabled={loading || disabled}
      className={`w-full py-3 font-sans text-sm font-semibold tracking-wide bg-accent text-white rounded-[3px] cursor-pointer transition-colors duration-200 hover:bg-accent-dk disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
