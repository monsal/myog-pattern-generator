import type { PatternRequest, GeneratedPattern } from '../types/pattern';
import type { GeneratePatternResponse } from '../types/api';

export class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export async function generatePattern(request: PatternRequest): Promise<GeneratedPattern> {
  try {
    const response = await fetch('/api/generate-pattern', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ request }),
    });

    const data: GeneratePatternResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new APIError(
        data.error || 'Failed to generate pattern',
        response.status
      );
    }

    if (!data.pattern) {
      throw new APIError('No pattern returned from API');
    }

    return data.pattern;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}
