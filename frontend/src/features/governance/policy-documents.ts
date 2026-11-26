export const supportedPolicyExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'] as const;
export type PolicyDocumentType = 'PDF' | 'Word' | 'Excel';

export function policyDocumentType(fileName: string): PolicyDocumentType | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'PDF';
  if (extension === 'doc' || extension === 'docx') return 'Word';
  if (extension === 'xls' || extension === 'xlsx') return 'Excel';
  return null;
}

export function isSupportedPolicyDocument(fileName: string) {
  return policyDocumentType(fileName) !== null;
}
