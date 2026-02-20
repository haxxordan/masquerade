export function WidgetPanel({
  title,
  accentColor,
  children,
}: {
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border mb-4 overflow-hidden" style={{ borderColor: accentColor }}>
      <div
        className="px-3 py-1 text-sm font-bold uppercase tracking-widest text-black"
        style={{ backgroundColor: accentColor }}
      >
        {title}
      </div>
      <div className="p-3 text-sm">{children}</div>
    </div>
  );
}
