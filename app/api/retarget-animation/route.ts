import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { createRetargetTask } from '@/lib/tripo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { taskId?: string; apiKey?: string; preset?: string };
    const { taskId, apiKey, preset } = body;

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'Missing Tripo API key' }, { status: 401 });
    if (!preset) return NextResponse.json({ error: 'Missing preset' }, { status: 400 });

    const normalizedApiKey = normalizeAndValidateApiKey(apiKey);
    if (!normalizedApiKey.ok) {
      return NextResponse.json({ error: normalizedApiKey.error }, { status: 400 });
    }

    const animationTaskId = await createRetargetTask(taskId, preset, normalizedApiKey.value);
    return NextResponse.json({ taskId: animationTaskId, preset, status: 'queued' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in retarget-animation route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
