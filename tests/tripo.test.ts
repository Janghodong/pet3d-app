import assert from 'node:assert/strict';
import test from 'node:test';

import { extractModelUrl, getTripoFileType } from '../lib/tripo.ts';

test('extractModelUrl prefers a real model asset over generic URLs', () => {
  const taskData = {
    status: 'success',
    output: {
      url: 'https://cdn.example.com/preview.png',
      model: 'https://cdn.example.com/asset.glb',
    },
  };

  assert.equal(extractModelUrl(taskData), 'https://cdn.example.com/asset.glb');
});

test('extractModelUrl can find nested model URLs inside object wrappers', () => {
  const taskData = {
    status: 'success',
    output: {
      assets: {
        pbr_model: {
          url: 'https://cdn.example.com/pets/corgi.glb?download=1',
        },
      },
    },
  };

  assert.equal(extractModelUrl(taskData), 'https://cdn.example.com/pets/corgi.glb?download=1');
});

test('extractModelUrl falls back to model-like keys when extension is missing', () => {
  const taskData = {
    status: 'success',
    output: {
      thumbnail_url: 'https://cdn.example.com/preview.png',
      rendered_model: 'https://cdn.example.com/generated/model-file',
    },
  };

  assert.equal(extractModelUrl(taskData), 'https://cdn.example.com/generated/model-file');
});

test('getTripoFileType maps supported mime types to Tripo file types', () => {
  assert.equal(getTripoFileType('image/png'), 'png');
  assert.equal(getTripoFileType('image/webp'), 'webp');
  assert.equal(getTripoFileType('image/jpeg'), 'jpg');
  assert.equal(getTripoFileType('image/jpg'), 'jpg');
});

test('getTripoFileType safely defaults unknown image types to jpg', () => {
  assert.equal(getTripoFileType('image/heic'), 'jpg');
  assert.equal(getTripoFileType(''), 'jpg');
});
