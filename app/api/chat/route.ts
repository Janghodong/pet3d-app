import { NextRequest, NextResponse } from 'next/server';
import { getPetResponse } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-anthropic-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 401 });

    const body = await request.json() as { message?: string; petName?: string };
    const { message, petName } = body;

    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    if (!petName) return NextResponse.json({ error: 'Missing petName' }, { status: 400 });

    const { reply, animationState } = await getPetResponse(message, petName, apiKey);
    return NextResponse.json({ reply, animationState });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
