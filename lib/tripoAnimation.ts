import type { AnimationState, TripoRigType } from './types';

const GENERAL_PRESETS: Record<AnimationState, string[]> = {
  idle: ['preset:idle'],
  happy: ['preset:laugh_01', 'preset:turn', 'preset:walk'],
  excited: ['preset:jump', 'preset:run', 'preset:walk'],
  sad: ['preset:sob', 'preset:hurt', 'preset:fall'],
  wave: ['preset:greet_01', 'preset:wave_goodbye_01', 'preset:turn'],
  headbang: ['preset:dance_01', 'preset:dance_02', 'preset:jump'],
};

const QUADRUPED_OVERRIDES: Partial<Record<AnimationState, string[]>> = {
  excited: ['preset:quadruped:walk', 'preset:run', 'preset:walk'],
};

export function getAnimationPresetsForState(
  animationState: AnimationState,
  rigType?: TripoRigType
) {
  const presets = [...GENERAL_PRESETS[animationState]];

  if (rigType === 'quadruped' && QUADRUPED_OVERRIDES[animationState]) {
    return [...(QUADRUPED_OVERRIDES[animationState] || []), ...presets].filter(uniqueOnly);
  }

  return presets.filter(uniqueOnly);
}

function uniqueOnly(value: string, index: number, array: string[]) {
  return array.indexOf(value) === index;
}
