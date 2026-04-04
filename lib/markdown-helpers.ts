/**
 * Recursively extracts plain string content from a React node tree.
 * Used to determine the text content of a rendered list item
 * before deciding which visual variant to apply.
 */
export function getTextContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node))
    return (node as unknown[]).map(getTextContent).join("");
  if (node !== null && typeof node === "object" && "props" in node) {
    return getTextContent(
      (node as { props: { children?: unknown } }).props.children,
    );
  }
  return "";
}

/**
 * Recursively extracts plain text from a blockquote React node,
 * preserving list-item bullet formatting (e.g. "- item text").
 * Used when copying the blockquote summary to clipboard.
 */
export function getBlockquoteText(node: unknown): string {
  if (typeof node === "string") return node.trim();
  if (Array.isArray(node)) {
    return (node as unknown[])
      .flatMap((n) => {
        const t = getBlockquoteText(n);
        return t ? [t] : [];
      })
      .join("\n");
  }
  if (node !== null && typeof node === "object" && "props" in node) {
    const el = node as { type?: string; props: { children?: unknown } };
    if (el.type === "li") {
      const t = getTextContent(el.props.children);
      return t ? `- ${t}` : "";
    }
    return getBlockquoteText(el.props.children);
  }
  return "";
}
