export type AnimationState = 'idle' | 'happy' | 'excited' | 'sad' | 'wave' | 'headbang';

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
