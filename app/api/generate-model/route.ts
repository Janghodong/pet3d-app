import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, createImageToModelTask, waitForModel } from '@/lib/tripo';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-tripo-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing Tripo API key' }, { status: 401 });

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const petName = formData.get('petName') as string | null;

    if (!imageFile) return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    if (!petName) return NextResponse.json({ error: 'Missing petName' }, { status: 400 });

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageFile.type || 'image/png';

    const fileToken = await uploadImage(buffer, mimeType, apiKey);
    const taskId = await createImageToModelTask(fileToken, apiKey);
    const modelUrl = await waitForModel(taskId, apiKey);

    return NextResponse.json({ modelUrl, taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in generate-model route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
