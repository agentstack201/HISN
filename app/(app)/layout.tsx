/** Layout for all inner pages: a centred content column below the fixed header. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-28">{children}</div>;
}
