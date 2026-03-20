import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { createRigTask } from '@/lib/tripo';
import type { TripoRigType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { taskId?: string; apiKey?: string; rigType?: TripoRigType };
    const { taskId, apiKey, rigType } = body;

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'Missing Tripo API key' }, { status: 401 });
    if (!rigType) return NextResponse.json({ error: 'Missing rigType' }, { status: 400 });

    const normalizedApiKey = normalizeAndValidateApiKey(apiKey);
    if (!normalizedApiKey.ok) {
      return NextResponse.json({ error: normalizedApiKey.error }, { status: 400 });
    }

    const rigTaskId = await createRigTask(taskId, rigType, normalizedApiKey.value);
    console.log('rig-model:start', { sourceTaskId: taskId, rigType, rigTaskId });
    return NextResponse.json({ taskId: rigTaskId, status: 'queued' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in rig-model route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
