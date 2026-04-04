import { LabelHTMLAttributes } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = "", children, ...props }: Props) {
  return (
    <label
      className={`font-mono text-xs tracking-[0.12em] uppercase text-muted ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
