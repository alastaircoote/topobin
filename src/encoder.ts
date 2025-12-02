import { Topology, Arc } from './types.js';
import { MAGIC, VERSION, FLAG_HAS_TRANSFORM, FLAG_HAS_BBOX } from './constants.js';

/**
 * Encodes a TopoJSON topology into a binary format using typed arrays
 */
export function encode(topology: Topology): ArrayBuffer {
  const hasTransform = !!topology.transform;
  const hasBBox = !!topology.bbox;

  // Calculate sizes
  const numArcs = topology.arcs.length;
  const totalArcPoints = topology.arcs.reduce((sum, arc) => sum + arc.length, 0);
  const objectNames = Object.keys(topology.objects);
  const numObjects = objectNames.length;

  // Build string table
  const stringTable = buildStringTable(topology);
  const stringTableSize = stringTable.byteLength;
  // Pad to 4-byte alignment for typed arrays
  const stringTablePadded = Math.ceil(stringTableSize / 4) * 4;

  // Calculate total buffer size
  let offset = 0;
  const headerSize = 24;
  offset += headerSize;

  if (hasTransform) offset += 32; // 4 x Float64
  if (hasBBox) offset += 32; // 4 x Float64

  offset += stringTablePadded;

  // Arc offsets: (numArcs + 1) x Uint32
  const arcOffsetsSize = (numArcs + 1) * 4;
  offset += arcOffsetsSize;

  // Ensure 8-byte alignment for Float64Array (when not using transform)
  const bytesPerCoord = hasTransform ? 4 : 8; // Int32 if quantized, Float64 otherwise
  if (bytesPerCoord === 8 && offset % 8 !== 0) {
    offset += 4; // Add padding to reach 8-byte alignment
  }
  const arcDataStart = offset;

  // Arc data: totalArcPoints x 2 coordinates
  const arcDataSize = totalArcPoints * 2 * bytesPerCoord;
  offset += arcDataSize;

  // For simplicity, we'll encode objects as JSON for now
  // In a full implementation, these would also be binary encoded
  const objectsJSON = JSON.stringify({
    names: objectNames,
    objects: topology.objects
  });
  const objectsData = new TextEncoder().encode(objectsJSON);
  const objectsSize = objectsData.byteLength;
  offset += 4 + objectsSize; // 4 bytes for size + data

  // Allocate buffer
  const buffer = new ArrayBuffer(offset);
  const view = new DataView(buffer);

  // Write header
  offset = 0;
  view.setUint32(offset, MAGIC, false); offset += 4;
  view.setUint16(offset, VERSION, false); offset += 2;

  let flags = 0;
  if (hasTransform) flags |= FLAG_HAS_TRANSFORM;
  if (hasBBox) flags |= FLAG_HAS_BBOX;
  view.setUint16(offset, flags, false); offset += 2;

  view.setUint32(offset, numArcs, false); offset += 4;
  view.setUint32(offset, totalArcPoints, false); offset += 4;
  view.setUint32(offset, numObjects, false); offset += 4;
  view.setUint32(offset, stringTableSize, false); offset += 4;

  // Write transform if present
  if (hasTransform && topology.transform) {
    view.setFloat64(offset, topology.transform.scale[0], false); offset += 8;
    view.setFloat64(offset, topology.transform.scale[1], false); offset += 8;
    view.setFloat64(offset, topology.transform.translate[0], false); offset += 8;
    view.setFloat64(offset, topology.transform.translate[1], false); offset += 8;
  }

  // Write bbox if present
  if (hasBBox && topology.bbox) {
    for (let i = 0; i < 4; i++) {
      view.setFloat64(offset, topology.bbox[i], false); offset += 8;
    }
  }

  // Write string table
  new Uint8Array(buffer, offset, stringTableSize).set(stringTable);
  offset += stringTablePadded; // Use padded size for alignment

  // Write arc offsets
  const arcOffsets = new Uint32Array(buffer, offset, numArcs + 1);
  let arcPointOffset = 0;
  for (let i = 0; i < numArcs; i++) {
    arcOffsets[i] = arcPointOffset;
    arcPointOffset += topology.arcs[i].length;
  }
  arcOffsets[numArcs] = arcPointOffset; // Total points
  offset += arcOffsetsSize;

  // Skip padding to reach arcDataStart if needed
  offset = arcDataStart;

  // Write arc data
  if (hasTransform) {
    const arcData = new Int32Array(buffer, offset, totalArcPoints * 2);
    let idx = 0;
    for (const arc of topology.arcs) {
      for (const [x, y] of arc) {
        arcData[idx++] = x;
        arcData[idx++] = y;
      }
    }
  } else {
    const arcData = new Float64Array(buffer, offset, totalArcPoints * 2);
    let idx = 0;
    for (const arc of topology.arcs) {
      for (const [x, y] of arc) {
        arcData[idx++] = x;
        arcData[idx++] = y;
      }
    }
  }
  offset += arcDataSize;

  // Write objects size and data
  view.setUint32(offset, objectsSize, false); offset += 4;
  new Uint8Array(buffer, offset, objectsSize).set(objectsData);

  return buffer;
}

/**
 * Builds a string table from object names and properties
 */
function buildStringTable(topology: Topology): Uint8Array {
  const encoder = new TextEncoder();
  const strings: Uint8Array[] = [];

  // Add object names
  for (const name of Object.keys(topology.objects)) {
    strings.push(encoder.encode(name + '\0'));
  }

  // Calculate total size
  const totalSize = strings.reduce((sum, s) => sum + s.byteLength, 0);

  // Concatenate all strings
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const s of strings) {
    result.set(s, offset);
    offset += s.byteLength;
  }

  return result;
}

/**
 * Get memory usage statistics for the binary format
 */
export function getMemoryStats(buffer: ArrayBuffer): {
  totalBytes: number;
  headerBytes: number;
  arcBytes: number;
  objectBytes: number;
} {
  const view = new DataView(buffer);

  let offset = 0;
  const magic = view.getUint32(offset, false); offset += 4;
  if (magic !== MAGIC) {
    throw new Error('Invalid magic number');
  }

  const version = view.getUint16(offset, false); offset += 2;
  const flags = view.getUint16(offset, false); offset += 2;
  const numArcs = view.getUint32(offset, false); offset += 4;
  const totalArcPoints = view.getUint32(offset, false); offset += 4;
  const numObjects = view.getUint32(offset, false); offset += 4;
  const stringTableSize = view.getUint32(offset, false); offset += 4;

  const hasTransform = (flags & FLAG_HAS_TRANSFORM) !== 0;
  const hasBBox = (flags & FLAG_HAS_BBOX) !== 0;

  let headerBytes = 24;
  if (hasTransform) headerBytes += 32;
  if (hasBBox) headerBytes += 32;
  headerBytes += stringTableSize;

  const arcOffsetsSize = (numArcs + 1) * 4;
  const bytesPerCoord = hasTransform ? 4 : 8;
  const arcDataSize = totalArcPoints * 2 * bytesPerCoord;
  const arcBytes = arcOffsetsSize + arcDataSize;

  const objectBytes = buffer.byteLength - headerBytes - arcBytes;

  return {
    totalBytes: buffer.byteLength,
    headerBytes,
    arcBytes,
    objectBytes
  };
}
