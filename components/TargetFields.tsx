/** Name / URL / authorization fields shared by the add and edit target forms. */
export default function TargetFields({ t, name = "", url = "" }: { t: { name: string; url: string; authorized: string }; name?: string; url?: string }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="name">{t.name}</label>
        <input className="input" id="name" name="name" defaultValue={name} maxLength={80} required />
      </div>
      <div>
        <label className="label" htmlFor="url">{t.url}</label>
        <input className="input" id="url" name="url" type="url" dir="ltr" defaultValue={url} placeholder="https://example.com" required />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="authorized" className="mt-1" required />
        {t.authorized}
      </label>
    </>
  );
}
