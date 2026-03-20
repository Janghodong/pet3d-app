import type { AnimationState } from './types';

const ANIMATION_KEYWORDS: Record<AnimationState, string[]> = {
  idle: ['idle', 'rest', 'stand', 'default', 'breathe'],
  happy: ['happy', 'joy', 'cheer', 'celebrate', 'bounce', 'smile'],
  excited: ['excited', 'run', 'jump', 'play', 'walk', 'trot', 'hop'],
  sad: ['sad', 'hurt', 'cry', 'fall', 'slow', 'defeat'],
  wave: ['wave', 'greet', 'hello', 'bye', 'turn', 'paw', 'hand'],
  headbang: ['headbang', 'dance', 'rock', 'shake', 'nod', 'groove'],
};

function normalizeClipName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findBestAnimationClipName(
  clipNames: string[],
  animationState: AnimationState
) {
  if (clipNames.length === 0) {
    return undefined;
  }

  const keywords = ANIMATION_KEYWORDS[animationState];
  const normalizedClips = clipNames.map((name) => ({
    original: name,
    normalized: normalizeClipName(name),
  }));

  for (const keyword of keywords) {
    const exactMatch = normalizedClips.find((clip) => clip.normalized === keyword);
    if (exactMatch) {
      return exactMatch.original;
    }
  }

  let bestMatch: { name: string; score: number } | undefined;

  for (const clip of normalizedClips) {
    let score = 0;

    keywords.forEach((keyword, index) => {
      if (clip.normalized.includes(keyword)) {
        score += 100 - index * 10;
      }
    });

    if (animationState === 'idle' && /loop|base/.test(clip.normalized)) {
      score += 15;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { name: clip.original, score };
    }
  }

  return bestMatch && bestMatch.score > 0 ? bestMatch.name : undefined;
}
