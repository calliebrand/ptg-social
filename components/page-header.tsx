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
    <div className="mb-6 flex flex-col gap-4 border-b border-[#0A0A0A] pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && (
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#767778]">{kicker}</div>
        )}
        <h1 className="font-display text-4xl leading-[0.9] tracking-tight md:text-6xl">{title}</h1>
        {lede && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#2a2a2a]">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
