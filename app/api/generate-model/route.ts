import { NextRequest, NextResponse } from 'next/server';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import { uploadImage, createImageToModelTask } from '@/lib/tripo';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey');
    const imageFile = formData.get('image') as File | null;
    const petName = formData.get('petName') as string | null;

    if (typeof apiKey !== 'string') return NextResponse.json({ error: 'Missing Tripo API key' }, { status: 401 });
    if (!imageFile) return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    if (!petName) return NextResponse.json({ error: 'Missing petName' }, { status: 400 });

    const normalizedApiKey = normalizeAndValidateApiKey(apiKey);
    if (!normalizedApiKey.ok) {
      return NextResponse.json({ error: normalizedApiKey.error }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageFile.type || 'image/png';

    const fileToken = await uploadImage(buffer, mimeType, normalizedApiKey.value);
    const taskId = await createImageToModelTask(fileToken, mimeType, normalizedApiKey.value);

    return NextResponse.json({ taskId, status: 'pending' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in generate-model route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
