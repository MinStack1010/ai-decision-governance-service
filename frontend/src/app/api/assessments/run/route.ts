import { NextResponse } from 'next/server';
import { workspaceSchema } from '@/features/governance/model';
import { runAutomatedAssessment, type AssessmentTrigger } from '@/features/governance/assessment-engine';
import { enrichWithConfiguredProvider } from '@/features/governance/assessment-provider';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspace?: unknown; systemId?: string; trigger?: AssessmentTrigger };
    const workspace = workspaceSchema.parse(body.workspace);
    if (!body.systemId) return NextResponse.json({ error: 'systemId is required' }, { status: 400 });
    const assessment = runAutomatedAssessment(workspace, body.systemId, body.trigger || 'on_demand');
    const enriched = await enrichWithConfiguredProvider(assessment, workspace);
    return NextResponse.json(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment could not be completed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
