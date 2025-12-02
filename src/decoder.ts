import { Topology, Transform, Arc } from './types.js';
import {
  MAGIC,
  MIN_SUPPORTED_VERSION,
  MAX_SUPPORTED_VERSION,
  FLAG_HAS_TRANSFORM,
  FLAG_HAS_BBOX
} from './constants.js';

/**
 * Gets the version number from a binary TopoJSON buffer without fully decoding it
 * Returns null if the buffer is not a valid TopoJSON binary format
 */
export function getVersion(buffer: ArrayBuffer): number | null {
  if (buffer.byteLength < 6) {
    return null; // Too small to contain magic + version
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);

  if (magic !== MAGIC) {
    return null; // Not a valid TopoJSON binary format
  }

  return view.getUint16(4, false);
}

/**
 * Checks if a binary TopoJSON buffer is compatible with this library version
 * Returns true if the buffer can be decoded, false otherwise
 */
export function isCompatibleVersion(buffer: ArrayBuffer): boolean {
  const version = getVersion(buffer);
  if (version === null) {
    return false;
  }
  return version >= MIN_SUPPORTED_VERSION && version <= MAX_SUPPORTED_VERSION;
}

/**
 * Decodes a binary TopoJSON buffer back into a TopoJSON topology object
 */
export function decode(buffer: ArrayBuffer): Topology {
  const view = new DataView(buffer);

  // Read header
  let offset = 0;
  const magic = view.getUint32(offset, false); offset += 4;
  if (magic !== MAGIC) {
    throw new Error('Invalid TopoJSON binary format: bad magic number');
  }

  const version = view.getUint16(offset, false); offset += 2;
  if (version < MIN_SUPPORTED_VERSION || version > MAX_SUPPORTED_VERSION) {
    throw new Error(
      `Unsupported binary format version ${version}. ` +
      `This library supports versions ${MIN_SUPPORTED_VERSION}-${MAX_SUPPORTED_VERSION}. ` +
      `Please upgrade the topobin library to decode this file.`
    );
  }

  const flags = view.getUint16(offset, false); offset += 2;
  const numArcs = view.getUint32(offset, false); offset += 4;
  const totalArcPoints = view.getUint32(offset, false); offset += 4;
  const numObjects = view.getUint32(offset, false); offset += 4;
  const stringTableSize = view.getUint32(offset, false); offset += 4;

  const hasTransform = (flags & FLAG_HAS_TRANSFORM) !== 0;
  const hasBBox = (flags & FLAG_HAS_BBOX) !== 0;

  // Read transform if present
  let transform: Transform | undefined;
  if (hasTransform) {
    transform = {
      scale: [
        view.getFloat64(offset, false),
        view.getFloat64(offset + 8, false)
      ],
      translate: [
        view.getFloat64(offset + 16, false),
        view.getFloat64(offset + 24, false)
      ]
    };
    offset += 32;
  }

  // Read bbox if present
  let bbox: [number, number, number, number] | undefined;
  if (hasBBox) {
    bbox = [
      view.getFloat64(offset, false),
      view.getFloat64(offset + 8, false),
      view.getFloat64(offset + 16, false),
      view.getFloat64(offset + 24, false)
    ];
    offset += 32;
  }

  // Read string table
  const stringTableBytes = new Uint8Array(buffer, offset, stringTableSize);
  const stringTable = parseStringTable(stringTableBytes);
  // Account for padding to 4-byte alignment
  const stringTablePadded = Math.ceil(stringTableSize / 4) * 4;
  offset += stringTablePadded;

  // Read arc offsets
  const arcOffsetsSize = (numArcs + 1) * 4;
  const arcOffsets = new Uint32Array(buffer, offset, numArcs + 1);
  offset += arcOffsetsSize;

  // Read arc data
  const bytesPerCoord = hasTransform ? 4 : 8;
  const arcDataSize = totalArcPoints * 2 * bytesPerCoord;

  const arcs: Arc[] = [];
  if (hasTransform) {
    const arcData = new Int32Array(buffer, offset, totalArcPoints * 2);
    for (let i = 0; i < numArcs; i++) {
      const start = arcOffsets[i];
      const end = arcOffsets[i + 1];
      const arc: Arc = [];
      for (let j = start; j < end; j++) {
        arc.push([arcData[j * 2], arcData[j * 2 + 1]]);
      }
      arcs.push(arc);
    }
  } else {
    const arcData = new Float64Array(buffer, offset, totalArcPoints * 2);
    for (let i = 0; i < numArcs; i++) {
      const start = arcOffsets[i];
      const end = arcOffsets[i + 1];
      const arc: Arc = [];
      for (let j = start; j < end; j++) {
        arc.push([arcData[j * 2], arcData[j * 2 + 1]]);
      }
      arcs.push(arc);
    }
  }
  offset += arcDataSize;

  // Read objects
  const objectsSize = view.getUint32(offset, false); offset += 4;
  const objectsBytes = new Uint8Array(buffer, offset, objectsSize);
  const objectsJSON = new TextDecoder().decode(objectsBytes);
  const { objects } = JSON.parse(objectsJSON);

  // Build topology
  const topology: Topology = {
    type: 'Topology',
    objects,
    arcs
  };

  if (transform) {
    topology.transform = transform;
  }

  if (bbox) {
    topology.bbox = bbox;
  }

  return topology;
}

/**
 * Parses a null-terminated string table
 */
function parseStringTable(bytes: Uint8Array): string[] {
  const decoder = new TextDecoder();
  const strings: string[] = [];
  let start = 0;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      strings.push(decoder.decode(bytes.slice(start, i)));
      start = i + 1;
    }
  }

  return strings;
}

/**
 * Creates a view into the binary data without decoding
 * Useful for memory-efficient access to specific arcs
 */
export class BinaryTopologyView {
  private view: DataView;
  private hasTransform: boolean;
  private numArcs: number;
  private arcOffsetsStart: number;
  private arcDataStart: number;
  private arcData: Int32Array | Float64Array;
  private arcOffsets: Uint32Array;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);

    // Read header
    let offset = 0;
    const magic = this.view.getUint32(offset, false); offset += 4;
    if (magic !== MAGIC) {
      throw new Error('Invalid TopoJSON binary format: bad magic number');
    }

    const version = this.view.getUint16(offset, false); offset += 2;
    if (version < MIN_SUPPORTED_VERSION || version > MAX_SUPPORTED_VERSION) {
      throw new Error(
        `Unsupported binary format version ${version}. ` +
        `This library supports versions ${MIN_SUPPORTED_VERSION}-${MAX_SUPPORTED_VERSION}. ` +
        `Please upgrade the topobin library to decode this file.`
      );
    }
    const flags = this.view.getUint16(offset, false); offset += 2;
    this.numArcs = this.view.getUint32(offset, false); offset += 4;
    const totalArcPoints = this.view.getUint32(offset, false); offset += 4;
    const numObjects = this.view.getUint32(offset, false); offset += 4;
    const stringTableSize = this.view.getUint32(offset, false); offset += 4;

    this.hasTransform = (flags & FLAG_HAS_TRANSFORM) !== 0;
    const hasBBox = (flags & FLAG_HAS_BBOX) !== 0;

    // Skip transform and bbox
    if (this.hasTransform) offset += 32;
    if (hasBBox) offset += 32;

    // Skip string table (with padding for alignment)
    const stringTablePadded = Math.ceil(stringTableSize / 4) * 4;
    offset += stringTablePadded;

    // Read arc offsets
    this.arcOffsetsStart = offset;
    this.arcOffsets = new Uint32Array(buffer, offset, this.numArcs + 1);
    offset += (this.numArcs + 1) * 4;

    // Read arc data
    this.arcDataStart = offset;
    if (this.hasTransform) {
      this.arcData = new Int32Array(buffer, offset, totalArcPoints * 2);
    } else {
      this.arcData = new Float64Array(buffer, offset, totalArcPoints * 2);
    }
  }

  /**
   * Get a specific arc by index without copying
   */
  getArc(index: number): Arc {
    if (index < 0 || index >= this.numArcs) {
      throw new Error(`Arc index out of bounds: ${index}`);
    }

    const start = this.arcOffsets[index];
    const end = this.arcOffsets[index + 1];
    const arc: Arc = [];

    for (let i = start; i < end; i++) {
      arc.push([this.arcData[i * 2], this.arcData[i * 2 + 1]]);
    }

    return arc;
  }

  /**
   * Get the number of arcs
   */
  getArcCount(): number {
    return this.numArcs;
  }

  /**
   * Iterate over all arcs efficiently
   */
  *iterArcs(): Generator<Arc, void, unknown> {
    for (let i = 0; i < this.numArcs; i++) {
      yield this.getArc(i);
    }
  }
}
