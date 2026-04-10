interface Props {
  message: string;
}

export function ErrorBox({ message }: Props) {
  return (
    <p className="font-mono text-xs px-3 py-2 rounded-[2px] text-error border border-error/30 bg-error/8">
      {message}
    </p>
  );
}
