/**
 * Internal utility for estimating in-memory size of TopoJSON objects.
 * This is used only for example/demonstration purposes and is not part of the public API.
 *
 * Estimates are based on JavaScript's memory model:
 * - Numbers are 64-bit floats (8 bytes each)
 * - Arrays have ~64 bytes overhead
 * - Objects have additional overhead for properties
 */

import type { Topology } from './types.js';

/**
 * Estimate in-memory size of TopoJSON object based on JavaScript's memory model
 * This is more accurate than generic object measurement libraries which don't account for
 * JavaScript's actual memory layout (64-bit numbers, array/object overhead, etc.)
 *
 * @internal - Not part of the public API, used only for examples
 */
export function estimateTopologyMemorySize(topology: Topology): number {
  let size = 0;

  // Base object overhead
  size += 64; // Topology object

  // Arcs: arrays of coordinate pairs [x, y]
  // Each number is a 64-bit float (8 bytes)
  // Each array has ~64 bytes overhead + 8 bytes per pointer
  if (topology.arcs) {
    size += 64; // arcs array overhead
    size += topology.arcs.length * 8; // pointers to arc arrays

    for (const arc of topology.arcs) {
      size += 64; // arc array overhead
      size += arc.length * 8; // pointers to coordinate arrays
      for (const coord of arc) {
        size += 64; // coordinate array overhead
        size += coord.length * 8; // actual numbers (8 bytes each)
      }
    }
  }

  // Objects: estimate based on JSON string size + overhead
  // This is an approximation as the structure varies
  if (topology.objects) {
    const objectsStr = JSON.stringify(topology.objects);
    // Rough estimate: 2x string size for object overhead, nested structures, etc.
    size += objectsStr.length * 2;
  }

  // Transform: small fixed overhead
  if (topology.transform) {
    size += 128; // object + 4 numbers (scale x/y, translate x/y)
  }

  // BBox: 4 numbers
  if (topology.bbox) {
    size += 96; // array overhead + 4 * 8 bytes
  }

  return size;
}
