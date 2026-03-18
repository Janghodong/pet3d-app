import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { getPetResponse } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { message?: string; petName?: string; apiKey?: string };
    const { message, petName, apiKey } = body;

    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    if (!petName) return NextResponse.json({ error: 'Missing petName' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 401 });

    const normalizedApiKey = normalizeAndValidateApiKey(apiKey);
    if (!normalizedApiKey.ok) {
      return NextResponse.json({ error: normalizedApiKey.error }, { status: 400 });
    }

    const { reply, animationState } = await getPetResponse(message, petName, normalizedApiKey.value);
    return NextResponse.json({ reply, animationState });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
