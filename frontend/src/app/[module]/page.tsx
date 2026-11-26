import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { routes } from '@/features/governance/model';
import { WorkspacePage } from '@/features/governance/workspace-page';
export function generateStaticParams() {
  return routes.map((r) => ({ module: r.path }));
}
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!routes.some((r) => r.path === module)) notFound();
  return (
    <Suspense fallback={<p role="status">Loading / Chargement…</p>}>
      <WorkspacePage module={module} />
    </Suspense>
  );
}
