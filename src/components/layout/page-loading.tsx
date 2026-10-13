export function PageLoading({ title = "กำลังเปิดหน้า" }: { title?: string }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p role="status" className="mt-2 text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
      </div>
      <div aria-hidden="true" className="card space-y-4 p-6 motion-safe:animate-pulse">
        <div className="h-10 w-full rounded bg-muted" />
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex gap-6 border-b pb-4">
            <div className="h-5 w-1/4 rounded bg-muted" />
            <div className="h-5 flex-1 rounded bg-muted" />
            <div className="h-5 w-1/6 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
