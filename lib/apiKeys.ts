const ASCII_HEADER_VALUE_REGEX = /^[\x20-\x7E]+$/;

export function sanitizeApiKey(value: string) {
  return value.replace(/[\u0000-\u001F\u007F\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, '').trim();
}

export function isValidApiKey(value: string) {
  return ASCII_HEADER_VALUE_REGEX.test(value);
}

export function normalizeAndValidateApiKey(value: string) {
  const sanitized = sanitizeApiKey(value);

  if (!sanitized) {
    return { ok: false as const, value: '', error: 'API Key 不能为空' };
  }

  if (!isValidApiKey(sanitized)) {
    return {
      ok: false as const,
      value: sanitized,
      error: 'API Key 包含无效字符，请重新复制粘贴，避免中文标点、智能引号或全角空格。',
    };
  }

  return { ok: true as const, value: sanitized };
}
