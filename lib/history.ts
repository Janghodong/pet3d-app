import type { AnimationState, AnimationVariant, ChatMessage, PetModelHistoryItem, RigPreparationStatus, TripoRigType } from './types';

export const MODEL_HISTORY_STORAGE_KEY = 'pet_model_history';
const MAX_HISTORY_ITEMS = 12;

interface UpsertHistoryItemInput {
  taskId: string;
  petName: string;
  modelUrl: string;
  messages?: ChatMessage[];
  animationState?: AnimationState;
  updatedAt?: string;
  rigStatus?: RigPreparationStatus;
  rigType?: TripoRigType;
  rigCheckTaskId?: string;
  rigTaskId?: string;
  riggedTaskId?: string;
  riggedModelUrl?: string;
  animationVariants?: Partial<Record<AnimationState, AnimationVariant>>;
}

export function parseHistoryItems(value: string | null): PetModelHistoryItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPetModelHistoryItem).map(normalizeHistoryItem).sort((a, b) => (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  } catch {
    return [];
  }
}

export function upsertHistoryItem(
  items: PetModelHistoryItem[],
  input: UpsertHistoryItemInput
) {
  const now = input.updatedAt ?? new Date().toISOString();
  const existing = items.find((item) => item.taskId === input.taskId);

  const nextItem: PetModelHistoryItem = {
    taskId: input.taskId,
    petName: input.petName,
    modelUrl: input.modelUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    animationState: input.animationState ?? existing?.animationState ?? 'idle',
    messages: input.messages ?? existing?.messages ?? [],
    rigStatus: input.rigStatus ?? existing?.rigStatus,
    rigType: input.rigType ?? existing?.rigType,
    rigCheckTaskId: input.rigCheckTaskId ?? existing?.rigCheckTaskId,
    rigTaskId: input.rigTaskId ?? existing?.rigTaskId,
    riggedTaskId: input.riggedTaskId ?? existing?.riggedTaskId,
    riggedModelUrl: input.riggedModelUrl ?? existing?.riggedModelUrl,
    animationVariants: input.animationVariants ?? existing?.animationVariants,
  };

  return [normalizeHistoryItem(nextItem), ...items.filter((item) => item.taskId !== input.taskId)].slice(0, MAX_HISTORY_ITEMS);
}

export function removeHistoryItem(items: PetModelHistoryItem[], taskId: string) {
  return items.filter((item) => item.taskId !== taskId);
}

export function hasRiggedAsset(item: Pick<PetModelHistoryItem, 'riggedTaskId'>) {
  return typeof item.riggedTaskId === 'string' && item.riggedTaskId.length > 0;
}

export function getHistoryRigStatus(item: PetModelHistoryItem): RigPreparationStatus | 'idle' {
  if (hasRiggedAsset(item)) {
    return 'ready';
  }

  if (item.rigTaskId) {
    return 'rigging';
  }

  if (item.rigStatus === 'failed' || item.rigStatus === 'unsupported') {
    return item.rigStatus;
  }

  return 'idle';
}

function normalizeHistoryItem(item: PetModelHistoryItem): PetModelHistoryItem {
  const rigStatus = getHistoryRigStatus(item);

  return {
    ...item,
    rigStatus,
    rigCheckTaskId: rigStatus === 'idle' ? '' : item.rigCheckTaskId,
    rigTaskId: rigStatus === 'rigging' ? item.rigTaskId : '',
    riggedModelUrl: hasRiggedAsset(item) ? item.riggedModelUrl : '',
  };
}

function isPetModelHistoryItem(value: unknown): value is PetModelHistoryItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<PetModelHistoryItem>;
  return (
    typeof item.taskId === 'string' &&
    typeof item.petName === 'string' &&
    typeof item.modelUrl === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    Array.isArray(item.messages)
  );
}
