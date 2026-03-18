const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';

export async function uploadImage(buffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const fileExtension = mimeType.split('/')[1] as 'png' | 'jpg' | 'webp';
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append('file', blob, `upload.${fileExtension}`);

  const response = await fetch(`${TRIPO_BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tripo3D upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) throw new Error(`Tripo3D upload error: ${JSON.stringify(data)}`);
  return data.data.image_token as string;
}

export async function createImageToModelTask(fileToken: string, apiKey: string): Promise<string> {
  const response = await fetch(`${TRIPO_BASE_URL}/task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'image_to_model', file: { type: 'png', file_token: fileToken } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tripo3D create task failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) throw new Error(`Tripo3D create task error: ${JSON.stringify(data)}`);
  return data.data.task_id as string;
}

export async function getTaskStatus(taskId: string, apiKey: string): Promise<{ status: string; modelUrl?: string }> {
  const response = await fetch(`${TRIPO_BASE_URL}/task/${taskId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tripo3D get task failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) throw new Error(`Tripo3D get task error: ${JSON.stringify(data)}`);

  const taskData = data.data;
  return { status: taskData.status as string, modelUrl: taskData.output?.model as string | undefined };
}

export async function waitForModel(taskId: string, apiKey: string): Promise<string> {
  const POLL_INTERVAL_MS = 5000;
  const MAX_WAIT_MS = 5 * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const { status, modelUrl } = await getTaskStatus(taskId, apiKey);

    if (status === 'success') {
      if (!modelUrl) throw new Error(`Task ${taskId} succeeded but no model URL returned`);
      return modelUrl;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Task ${taskId} ended with status: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Task ${taskId} timed out after 5 minutes`);
}
