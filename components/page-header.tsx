export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
