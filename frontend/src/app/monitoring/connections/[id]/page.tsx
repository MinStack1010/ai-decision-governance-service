import { ConnectionDetail } from '@/features/monitoring/components/connection-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConnectionDetail id={id} />;
}
