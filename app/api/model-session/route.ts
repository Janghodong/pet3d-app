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

    const { status, modelUrl } = await getTaskStatus(taskId, normalizedApiKey.value);

    if (status !== 'success') {
      return NextResponse.json({ error: `当前模型状态为 ${status}，暂时无法恢复。` }, { status: 409 });
    }

    if (!modelUrl) {
      return NextResponse.json({ error: '模型已完成，但暂时拿不到可用下载地址。' }, { status: 502 });
    }

    return NextResponse.json({ taskId, modelUrl, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in model-session route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
