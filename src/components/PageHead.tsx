/**
 * A section head in the Record system: number, title, one line of context, controls on the rule.
 * `no` is not decoration — the page is a document with numbered sections, and the number is what
 * lets someone quote a part of it back to you in an email.
 */
export default function PageHead({
  eyebrow, title, meta, actions, no,
}: {
  eyebrow?: React.ReactNode; title: string; meta?: React.ReactNode; actions?: React.ReactNode; no?: string;
}) {
  return (
    <div className="flex items-end gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5 mb-1.5">
          {no && <span className="sect-no">{no}</span>}
          {eyebrow && (
            <span className="eyebrow text-txt-dim flex items-center gap-2">{eyebrow}</span>
          )}
        </div>
        <h1 className="text-xl2 sm:text-[31px] sm:leading-[36px] text-txt-hi">{title}</h1>
        {meta && (
          <div className="text-xs2 text-txt-lo mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
            {meta}
          </div>
        )}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 shrink-0 pb-0.5">{actions}</div>}
    </div>
  );
}
