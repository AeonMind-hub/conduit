export default function PageHead({
  title, meta, actions,
}: { title: string; meta?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-wrap mb-5">
      <div className="min-w-0">
        <h1 className="text-base2 font-semibold text-txt-hi leading-tight">{title}</h1>
        {meta && <p className="text-xs2 text-txt-lo mt-1">{meta}</p>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
