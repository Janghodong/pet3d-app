export type AnimationState = 'idle' | 'happy' | 'excited' | 'sad' | 'wave' | 'headbang';
export type TripoRigType = 'biped' | 'quadruped' | 'hexapod' | 'octopod' | 'avian' | 'serpentine' | 'aquatic' | 'others';
export type AnimationVariantStatus = 'idle' | 'queued' | 'running' | 'ready' | 'failed';
export type RigPreparationStatus = 'idle' | 'checking' | 'rigging' | 'ready' | 'failed' | 'unsupported';

export interface ModelGenerationStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  modelUrl?: string;
  progress?: number;
}

export interface ChatMessage {
  role: 'user' | 'pet';
  content: string;
  animationState?: AnimationState;
}

export interface ChatResponse {
  reply: string;
  animationState: AnimationState;
}

export interface AnimationVariant {
  taskId?: string;
  modelUrl?: string;
  status: AnimationVariantStatus;
  preset?: string;
  presetIndex?: number;
  updatedAt: string;
}

export interface PetModelHistoryItem {
  taskId: string;
  petName: string;
  modelUrl: string;
  createdAt: string;
  updatedAt: string;
  animationState: AnimationState;
  messages: ChatMessage[];
  rigStatus?: RigPreparationStatus;
  rigType?: TripoRigType;
  rigCheckTaskId?: string;
  rigTaskId?: string;
  riggedTaskId?: string;
  riggedModelUrl?: string;
  animationVariants?: Partial<Record<AnimationState, AnimationVariant>>;
}
