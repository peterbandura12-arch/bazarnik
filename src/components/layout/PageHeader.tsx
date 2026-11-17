export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="border-b border-ink-100 pb-6">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-ink-600">{description}</p>
      ) : null}
    </header>
  );
}
