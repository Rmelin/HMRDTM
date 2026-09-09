type Props = {
  title: string;
  defaultOpen?: boolean;
  id?: string;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  id,
  children
}: Props) {
  return (
    <details className="section" id={id} open={defaultOpen}>
      <summary className="section-title">{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
