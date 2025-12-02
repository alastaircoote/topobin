import { test } from 'node:test';
import assert from 'node:assert';
import { encode, decode, BinaryTopologyView, getMemoryStats } from '../lib/index.js';

test('encode and decode simple topology', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1], [2, 0]],
      [[2, 0], [3, 1]]
    ],
    objects: {
      test: {
        type: 'LineString',
        arcs: [0]
      }
    }
  };

  const buffer = encode(topology);
  assert.ok(buffer instanceof ArrayBuffer);
  assert.ok(buffer.byteLength > 0);

  const decoded = decode(buffer);
  assert.strictEqual(decoded.type, 'Topology');
  assert.strictEqual(decoded.arcs.length, 2);
  assert.strictEqual(decoded.objects.test.type, 'LineString');
});

test('encode and decode topology with transform', () => {
  const topology = {
    type: 'Topology',
    transform: {
      scale: [0.001, 0.001],
      translate: [-180, -90]
    },
    arcs: [
      [[0, 0], [1000, 1000]],
      [[1000, 1000], [2000, 0]]
    ],
    objects: {
      line: {
        type: 'LineString',
        arcs: [0, 1]
      }
    }
  };

  const buffer = encode(topology);
  const decoded = decode(buffer);

  assert.ok(decoded.transform);
  assert.deepStrictEqual(decoded.transform.scale, [0.001, 0.001]);
  assert.deepStrictEqual(decoded.transform.translate, [-180, -90]);
  assert.strictEqual(decoded.arcs.length, 2);
});

test('encode and decode topology with bbox', () => {
  const topology = {
    type: 'Topology',
    bbox: [-180, -90, 180, 90],
    arcs: [
      [[0, 0], [1, 1]]
    ],
    objects: {
      point: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }
  };

  const buffer = encode(topology);
  const decoded = decode(buffer);

  assert.ok(decoded.bbox);
  assert.deepStrictEqual(decoded.bbox, [-180, -90, 180, 90]);
});

test('round-trip preserves arc data', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[100, 200], [150, 250], [200, 200]],
      [[0, 0], [10, 10], [20, 0], [10, -10]]
    ],
    objects: {
      polygon: {
        type: 'Polygon',
        arcs: [[0]]
      }
    }
  };

  const buffer = encode(topology);
  const decoded = decode(buffer);

  assert.strictEqual(decoded.arcs.length, topology.arcs.length);

  // Check first arc
  assert.strictEqual(decoded.arcs[0].length, topology.arcs[0].length);
  assert.deepStrictEqual(decoded.arcs[0], topology.arcs[0]);

  // Check second arc
  assert.strictEqual(decoded.arcs[1].length, topology.arcs[1].length);
  assert.deepStrictEqual(decoded.arcs[1], topology.arcs[1]);
});

test('BinaryTopologyView can access arcs without full decode', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1]],
      [[2, 2], [3, 3], [4, 4]],
      [[5, 5], [6, 6]]
    ],
    objects: {
      test: {
        type: 'LineString',
        arcs: [0]
      }
    }
  };

  const buffer = encode(topology);
  const view = new BinaryTopologyView(buffer);

  assert.strictEqual(view.getArcCount(), 3);

  // Check first arc
  const arc0 = view.getArc(0);
  assert.strictEqual(arc0.length, 2);
  assert.deepStrictEqual(arc0, [[0, 0], [1, 1]]);

  // Check second arc
  const arc1 = view.getArc(1);
  assert.strictEqual(arc1.length, 3);
  assert.deepStrictEqual(arc1, [[2, 2], [3, 3], [4, 4]]);

  // Check third arc
  const arc2 = view.getArc(2);
  assert.strictEqual(arc2.length, 2);
  assert.deepStrictEqual(arc2, [[5, 5], [6, 6]]);
});

test('BinaryTopologyView throws error for out of bounds index', () => {
  const topology = {
    type: 'Topology',
    arcs: [[[0, 0], [1, 1]]],
    objects: { test: { type: 'Point', coordinates: [0, 0] } }
  };

  const buffer = encode(topology);
  const view = new BinaryTopologyView(buffer);

  assert.throws(() => view.getArc(-1), /out of bounds/);
  assert.throws(() => view.getArc(1), /out of bounds/);
});

test('BinaryTopologyView iterArcs works correctly', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1]],
      [[2, 2], [3, 3]],
      [[4, 4], [5, 5]]
    ],
    objects: { test: { type: 'Point', coordinates: [0, 0] } }
  };

  const buffer = encode(topology);
  const view = new BinaryTopologyView(buffer);

  const arcs = [...view.iterArcs()];
  assert.strictEqual(arcs.length, 3);
  assert.deepStrictEqual(arcs[0], [[0, 0], [1, 1]]);
  assert.deepStrictEqual(arcs[1], [[2, 2], [3, 3]]);
  assert.deepStrictEqual(arcs[2], [[4, 4], [5, 5]]);
});

test('getMemoryStats returns correct breakdown', () => {
  const topology = {
    type: 'Topology',
    arcs: [
      [[0, 0], [1, 1]],
      [[2, 2], [3, 3]]
    ],
    objects: {
      test: {
        type: 'LineString',
        arcs: [0, 1]
      }
    }
  };

  const buffer = encode(topology);
  const stats = getMemoryStats(buffer);

  assert.strictEqual(stats.totalBytes, buffer.byteLength);
  assert.ok(stats.headerBytes > 0);
  assert.ok(stats.arcBytes > 0);
  assert.ok(stats.objectBytes > 0);
  assert.strictEqual(
    stats.totalBytes,
    stats.headerBytes + stats.arcBytes + stats.objectBytes
  );
});

test('encode handles empty arcs array', () => {
  const topology = {
    type: 'Topology',
    arcs: [],
    objects: {
      empty: {
        type: 'GeometryCollection',
        geometries: []
      }
    }
  };

  const buffer = encode(topology);
  const decoded = decode(buffer);

  assert.strictEqual(decoded.arcs.length, 0);
  assert.ok(decoded.objects.empty);
});

test('encode handles quantized coordinates with transform', () => {
  const topology = {
    type: 'Topology',
    transform: {
      scale: [0.0001, 0.0001],
      translate: [0, 0]
    },
    arcs: [
      [[0, 0], [10000, 10000], [20000, 0]]
    ],
    objects: {
      line: {
        type: 'LineString',
        arcs: [0]
      }
    }
  };

  const buffer = encode(topology);
  const decoded = decode(buffer);

  assert.ok(decoded.transform);
  assert.deepStrictEqual(decoded.arcs[0], topology.arcs[0]);
});
