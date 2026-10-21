/**
 * Shown while a page in the app section loads its data.
 * Next.js swaps this in automatically, so navigation never feels frozen.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-48 skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 skeleton" />
        ))}
      </div>
      <div className="h-56 skeleton" />
      <div className="h-40 skeleton" />
    </div>
  );
}
