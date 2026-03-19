const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_FETCH_TIMEOUT_MS = 30000;

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

export function looksLikeModelUrl(value: string) {
  return /\.(glb|gltf)(\?|$)/i.test(value);
}

export function isModelLikeKey(key: string) {
  return /(^|_)(pbr_model|model|glb|gltf|model_url|rendered_model|download_url)(_|$)/i.test(key);
}

export function extractHttpUrl(value: unknown): string | undefined {
  if (isHttpUrl(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const entries = Object.entries(value);

  for (const [key, nestedValue] of entries) {
    if (isModelLikeKey(key) && isHttpUrl(nestedValue)) {
      return nestedValue;
    }
  }

  for (const [, nestedValue] of entries) {
    if (isHttpUrl(nestedValue)) {
      return nestedValue;
    }
  }

  return undefined;
}

export function extractModelUrl(taskData: unknown): string | undefined {
  if (!taskData || typeof taskData !== 'object') return undefined;

  const visited = new Set<unknown>();
  const queue: unknown[] = [taskData];
  const modelKeyCandidates: string[] = [];
  const modelUrlCandidates: string[] = [];
  const genericUrlCandidates: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const entries = Object.entries(current);

    for (const [key, value] of entries) {
      const httpUrl = extractHttpUrl(value);
      if (!httpUrl) continue;

      if (isModelLikeKey(key)) {
        if (looksLikeModelUrl(httpUrl)) {
          return httpUrl;
        }

        modelKeyCandidates.push(httpUrl);
        continue;
      }

      if (looksLikeModelUrl(httpUrl)) {
        modelUrlCandidates.push(httpUrl);
        continue;
      }

      genericUrlCandidates.push(httpUrl);
    }

    for (const [, value] of entries) {
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return modelKeyCandidates[0] ?? modelUrlCandidates[0] ?? genericUrlCandidates[0];
}

export function getTripoFileType(mimeType: string): 'png' | 'jpg' | 'webp' {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function toErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const cause = error.cause as { code?: string } | undefined;

  if (cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return '连接 Tripo3D API 超时，请检查当前网络后重试';
  }

  if (error.name === 'AbortError') {
    return '请求 Tripo3D API 超时，请稍后重试';
  }

  return error.message || fallback;
}

async function fetchTripo(path: string, init: RequestInit) {
  try {
    return await fetch(`${TRIPO_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TRIPO_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(toErrorMessage(error, '请求 Tripo3D API 失败'), { cause: error });
  }
}

export async function uploadImage(buffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const fileExtension = getTripoFileType(mimeType);
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append('file', blob, `upload.${fileExtension}`);

  const response = await fetchTripo('/upload', {
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

export async function createImageToModelTask(fileToken: string, mimeType: string, apiKey: string): Promise<string> {
  const response = await fetchTripo('/task', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: getTripoFileType(mimeType), file_token: fileToken },
      output: { format: 'glb' },
    }),
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
  const response = await fetchTripo(`/task/${taskId}`, {
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
  return {
    status: taskData.status as string,
    modelUrl: extractModelUrl(taskData),
  };
}

export async function waitForModel(taskId: string, apiKey: string): Promise<string> {
  const POLL_INTERVAL_MS = 5000;
  const MAX_WAIT_MS = 5 * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const { status, modelUrl } = await getTaskStatus(taskId, apiKey);

    if (status === 'success') {
      if (!modelUrl) {
        const response = await fetchTripo(`/task/${taskId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await response.json();
        const outputKeys = Object.keys(data?.data?.output ?? {});
        throw new Error(`Task ${taskId} succeeded but no usable model URL returned. Output keys: ${outputKeys.join(', ') || 'none'}`);
      }
      return modelUrl;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Task ${taskId} ended with status: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Task ${taskId} timed out after 5 minutes`);
}
