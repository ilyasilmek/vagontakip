export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { operationIds: string[] }) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) }, { status: error.status });
  }
  // Avoid leaking upstream responses, URLs, credentials or stored records.
  console.error('VagonTakip request failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.', code: 'INTERNAL_ERROR' }, { status: 500 });
}
