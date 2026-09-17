export default function PageHead({
  eyebrow, title, meta, actions,
}: { eyebrow?: React.ReactNode; title: string; meta?: React.ReactNode; actions?: React.ReactNode }) {
  /* A page header used to be 14px of text — the same weight as everything else, which is most of
     why the app read flat. Title at display size, one line of context, controls on the right. */
  return (
    <div className="flex items-end gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2 mb-2 text-micro uppercase tracking-[0.075em] text-txt-dim">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl2 sm:text-[26px] sm:leading-[32px] font-semibold text-txt-hi
                       tracking-[-0.022em]">{title}</h1>
        {meta && <div className="text-xs2 text-txt-lo mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">{meta}</div>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 shrink-0 pb-0.5">{actions}</div>}
    </div>
  );
}
