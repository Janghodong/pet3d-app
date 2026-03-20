import assert from 'node:assert/strict';
import test from 'node:test';

import { getHistoryRigStatus, hasRiggedAsset, parseHistoryItems, removeHistoryItem, upsertHistoryItem } from '../lib/history.ts';

test('parseHistoryItems returns empty array for invalid payloads', () => {
  assert.deepEqual(parseHistoryItems(null), []);
  assert.deepEqual(parseHistoryItems('not-json'), []);
  assert.deepEqual(parseHistoryItems('{"foo":"bar"}'), []);
});

test('upsertHistoryItem inserts new entries and keeps most recent first', () => {
  const first = upsertHistoryItem([], {
    taskId: 'task-1',
    petName: 'Momo',
    modelUrl: 'https://example.com/momo.glb',
    updatedAt: '2026-03-19T08:00:00.000Z',
  });

  const second = upsertHistoryItem(first, {
    taskId: 'task-2',
    petName: 'Coco',
    modelUrl: 'https://example.com/coco.glb',
    updatedAt: '2026-03-19T09:00:00.000Z',
  });

  assert.equal(second[0]?.taskId, 'task-2');
  assert.equal(second[1]?.taskId, 'task-1');
});

test('upsertHistoryItem updates existing entries while preserving createdAt', () => {
  const items = upsertHistoryItem([], {
    taskId: 'task-1',
    petName: 'Momo',
    modelUrl: 'https://example.com/old.glb',
    updatedAt: '2026-03-19T08:00:00.000Z',
  });

  const updated = upsertHistoryItem(items, {
    taskId: 'task-1',
    petName: 'Momo',
    modelUrl: 'https://example.com/new.glb',
    updatedAt: '2026-03-19T10:00:00.000Z',
  });

  assert.equal(updated[0]?.modelUrl, 'https://example.com/new.glb');
  assert.equal(updated[0]?.createdAt, '2026-03-19T08:00:00.000Z');
  assert.equal(updated[0]?.updatedAt, '2026-03-19T10:00:00.000Z');
});

test('removeHistoryItem deletes the requested task', () => {
  const items = [
    {
      taskId: 'task-1',
      petName: 'Momo',
      modelUrl: 'https://example.com/momo.glb',
      createdAt: '2026-03-19T08:00:00.000Z',
      updatedAt: '2026-03-19T08:00:00.000Z',
      animationState: 'idle' as const,
      messages: [],
    },
    {
      taskId: 'task-2',
      petName: 'Coco',
      modelUrl: 'https://example.com/coco.glb',
      createdAt: '2026-03-19T09:00:00.000Z',
      updatedAt: '2026-03-19T09:00:00.000Z',
      animationState: 'idle' as const,
      messages: [],
    },
  ];

  assert.deepEqual(removeHistoryItem(items, 'task-1').map((item) => item.taskId), ['task-2']);
});

test('parseHistoryItems resets stale ready status when no rigged task exists', () => {
  const items = parseHistoryItems(JSON.stringify([{
    taskId: 'task-1',
    petName: 'Momo',
    modelUrl: 'https://example.com/momo.glb',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
    animationState: 'idle',
    messages: [],
    rigStatus: 'ready',
  }]));

  assert.equal(items[0]?.rigStatus, 'idle');
  assert.equal(getHistoryRigStatus(items[0]!), 'idle');
});

test('parseHistoryItems keeps rigged models resumable even when signed url is absent', () => {
  const items = parseHistoryItems(JSON.stringify([{
    taskId: 'task-1',
    petName: 'Momo',
    modelUrl: 'https://example.com/momo.glb',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
    animationState: 'idle',
    messages: [],
    rigStatus: 'ready',
    riggedTaskId: 'rig-task-1',
  }]));

  assert.equal(hasRiggedAsset(items[0]!), true);
  assert.equal(getHistoryRigStatus(items[0]!), 'ready');
});
