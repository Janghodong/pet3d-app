import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { getTaskStatus } from '@/lib/tripo';

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

    const { status, modelUrl, riggable, rigType, taskType } = await getTaskStatus(taskId, normalizedApiKey.value);
    console.log('model-status', {
      taskId,
      status,
      taskType,
      riggable,
      rigType,
      hasModelUrl: Boolean(modelUrl),
    });
    return NextResponse.json({ taskId, status, modelUrl, riggable, rigType, taskType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in model-status route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
