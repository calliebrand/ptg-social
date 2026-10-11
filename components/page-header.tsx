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
    <div className="mb-4 flex flex-col gap-3 border-b border-line pb-3 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && <div className="micro mb-1 text-mute">{kicker}</div>}
        <h1 className="text-[22px] font-medium leading-none tracking-[-0.035em] text-ink">{title}</h1>
        {lede && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-mute">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
