import assert from 'node:assert/strict';
import test from 'node:test';

import { findBestAnimationClipName } from '../lib/animation.ts';

test('findBestAnimationClipName matches exact animation keywords first', () => {
  const clipName = findBestAnimationClipName(
    ['Idle', 'Happy_Jump', 'RunFast'],
    'happy'
  );

  assert.equal(clipName, 'Happy_Jump');
});

test('findBestAnimationClipName can map semantic states to nearby clip names', () => {
  const clipName = findBestAnimationClipName(
    ['GreetingTurn', 'SlowBreath', 'DanceLoop'],
    'wave'
  );

  assert.equal(clipName, 'GreetingTurn');
});

test('findBestAnimationClipName returns undefined when there is no reasonable match', () => {
  const clipName = findBestAnimationClipName(
    ['Attack', 'Sleep', 'Swim'],
    'wave'
  );

  assert.equal(clipName, undefined);
});
