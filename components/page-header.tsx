export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-mute">{kicker}</div>}
        <h1 className="font-display text-4xl leading-none text-ink">{title}</h1>
        {lede && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
