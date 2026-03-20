import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { createRigCheckTask } from '@/lib/tripo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { taskId?: string; apiKey?: string };
    const { taskId, apiKey } = body;

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'Missing Tripo API key' }, { status: 401 });

    const normalizedApiKey = normalizeAndValidateApiKey(apiKey);
    if (!normalizedApiKey.ok) {
      return NextResponse.json({ error: normalizedApiKey.error }, { status: 400 });
    }

    const rigCheckTaskId = await createRigCheckTask(taskId, normalizedApiKey.value);
    console.log('rig-check:start', { sourceTaskId: taskId, rigCheckTaskId });
    return NextResponse.json({ taskId: rigCheckTaskId, status: 'queued' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in rig-check route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
