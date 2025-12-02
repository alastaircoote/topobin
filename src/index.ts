/**
 * topobin - Memory-efficient binary encoding for TopoJSON
 *
 * This library converts TopoJSON objects into a compact binary format using typed arrays,
 * significantly reducing memory usage compared to JSON objects.
 */

import type { Topology } from './types.js';

export { encode, getMemoryStats } from './encoder.js';
export { decode, BinaryTopologyView } from './decoder.js';
export type {
  Topology,
  Transform,
  Arc,
  Geometry,
  GeometryType,
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  GeometryCollection,
  BinaryTopology
} from './types.js';

/**
 * Calculate memory savings of binary format vs JSON
 */
export function compareMemoryUsage(topology: Topology, binaryBuffer: ArrayBuffer): {
  jsonBytes: number;
  binaryBytes: number;
  savingsBytes: number;
  savingsPercent: number;
} {
  const jsonString = JSON.stringify(topology);
  const jsonBytes = new TextEncoder().encode(jsonString).byteLength;
  const binaryBytes = binaryBuffer.byteLength;
  const savingsBytes = jsonBytes - binaryBytes;
  const savingsPercent = (savingsBytes / jsonBytes) * 100;

  return {
    jsonBytes,
    binaryBytes,
    savingsBytes,
    savingsPercent
  };
}