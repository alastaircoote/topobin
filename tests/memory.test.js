import { test } from 'node:test';
import assert from 'node:assert';
import { encode, compareMemoryUsage } from '../lib/index.js';

test('compareMemoryUsage returns expected properties', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1], [2, 0]],
      [[2, 0], [3, 1]]
    ],
    objects: {
      line: {
        type: 'LineString',
        arcs: [0]
      }
    }
  };

  const buffer = encode(topology);
  const comparison = compareMemoryUsage(topology, buffer);

  // Check all properties exist
  assert.ok(comparison.jsonBytes);
  assert.ok(comparison.binaryBytes);
  assert.ok(typeof comparison.savingsBytes === 'number');
  assert.ok(typeof comparison.savingsPercent === 'number');
  assert.ok(comparison.inMemoryJsonBytes);
  assert.ok(comparison.inMemoryBinaryBytes);
  assert.ok(typeof comparison.inMemorySavingsBytes === 'number');
  assert.ok(typeof comparison.inMemorySavingsPercent === 'number');
});

test('compareMemoryUsage shows in-memory savings', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1], [2, 0]],
      [[2, 0], [3, 1], [4, 2]]
    ],
    objects: {
      line: {
        type: 'LineString',
        arcs: [0, 1]
      }
    }
  };

  const buffer = encode(topology);
  const comparison = compareMemoryUsage(topology, buffer);

  // For very small topologies, binary format may be slightly larger
  // due to header overhead (24 bytes + offsets), but this is expected
  assert.ok(comparison.binaryBytes > 0);
  assert.ok(comparison.jsonBytes > 0);

  // In-memory binary should always be smaller due to typed arrays
  assert.ok(comparison.inMemoryBinaryBytes < comparison.inMemoryJsonBytes);
  assert.ok(comparison.inMemorySavingsPercent > 0);
});

test('compareMemoryUsage calculates percentages correctly', () => {
  const topology = {
    type: 'Topology',
    arcs: [[[0, 0], [1, 1]]],
    objects: {
      point: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }
  };

  const buffer = encode(topology);
  const comparison = compareMemoryUsage(topology, buffer);

  // Calculate expected percentage
  const expectedPercent =
    ((comparison.jsonBytes - comparison.binaryBytes) / comparison.jsonBytes) * 100;

  assert.ok(Math.abs(comparison.savingsPercent - expectedPercent) < 0.01);

  // In-memory savings should be positive (binary is smaller)
  assert.ok(comparison.inMemorySavingsPercent > 0);
});

test('compareMemoryUsage handles topology with transform', () => {
  const topology = {
    type: 'Topology',
    transform: {
      scale: [0.001, 0.001],
      translate: [-180, -90]
    },
    arcs: [
      [[0, 0], [1000, 1000]]
    ],
    objects: {
      line: {
        type: 'LineString',
        arcs: [0]
      }
    }
  };

  const buffer = encode(topology);
  const comparison = compareMemoryUsage(topology, buffer);

  assert.ok(comparison.binaryBytes > 0);
  assert.ok(comparison.inMemoryBinaryBytes > 0);
});

test('compareMemoryUsage shows large in-memory savings', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]],
      [[5, 5], [6, 6], [7, 7], [8, 8], [9, 9]],
      [[10, 10], [11, 11], [12, 12], [13, 13], [14, 14]]
    ],
    objects: {
      multiline: {
        type: 'MultiLineString',
        arcs: [[0], [1], [2]]
      }
    }
  };

  const buffer = encode(topology);
  const comparison = compareMemoryUsage(topology, buffer);

  // In-memory savings should be significant (typically 70%+)
  assert.ok(comparison.inMemorySavingsPercent > 50);
});
