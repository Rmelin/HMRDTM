type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children
}: Props) {
  return (
    <details className="section" open={defaultOpen}>
      <summary className="section-title">{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
