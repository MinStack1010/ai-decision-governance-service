import { IncidentDetail } from '@/features/monitoring/components/connection-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IncidentDetail id={id} />;
}
