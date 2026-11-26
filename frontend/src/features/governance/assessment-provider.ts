import { z } from 'zod';
import type { Assessment, Workspace } from './model';
import { requirements } from './fixtures';

const providerResponseSchema = z.object({
  findings: z.array(z.object({
    requirementId: z.string(),
    analysis: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable(),
  })),
});

/**
 * Optional OpenAI-compatible enrichment. Rules remain authoritative for the
 * outcome and evidence gate; provider text can only enrich a known finding.
 */
export async function enrichWithConfiguredProvider(
  assessment: Assessment,
  workspace: Workspace,
): Promise<{ assessment: Assessment; provider: string; aiUsed: boolean }> {
  const provider = process.env.ASSESSMENT_AI_PROVIDER || 'rules';
  const endpoint = process.env.ASSESSMENT_AI_PROVIDER_URL;
  if (provider !== 'openai-compatible' || !endpoint) return { assessment, provider, aiUsed: false };

  const system = workspace.systems.find((item) => item.id === assessment.systemId);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.ASSESSMENT_AI_PROVIDER_KEY ? { authorization: `Bearer ${process.env.ASSESSMENT_AI_PROVIDER_KEY}` } : {}) },
      body: JSON.stringify({
        system,
        requirements: requirements.map((requirement) => ({ id: requirement.id, title: requirement.title, description: requirement.description })),
        evidence: workspace.evidence.filter((item) => item.systemId === assessment.systemId),
        audit: workspace.audit.filter((item) => item.resource === assessment.systemId),
        response_format: 'structured_json',
      }),
    });
  } catch {
    return { assessment, provider, aiUsed: false };
  }
  if (!response.ok) return { assessment, provider, aiUsed: false };
  const parsed = providerResponseSchema.safeParse(await response.json());
  if (!parsed.success) return { assessment, provider, aiUsed: false };
  const byRequirement = new Map(parsed.data.findings.map((finding) => [finding.requirementId, finding]));
  return {
    provider,
    aiUsed: true,
    assessment: {
      ...assessment,
      engineVersion: 'rules-1.0+provider-validated',
      findings: assessment.findings.map((finding) => {
        const enrichment = byRequirement.get(finding.requirementId);
        if (!enrichment) return finding;
        return {
          ...finding,
          analysis: { en: enrichment.analysis, fr: enrichment.analysis },
          confidence: finding.evidenceSourceIds?.length ? enrichment.confidence : null,
        };
      }),
    },
  };
}
