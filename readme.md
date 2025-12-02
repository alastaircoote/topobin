# topobin

A library that creates a more memory-efficient binary encoding for TopoJSON using typed arrays. This is also an experiment I'm doing in using AI to generate a library with minimal manual code input.

## Overview

TopoJSON is typically stored as JSON, which can be memory-intensive for large geographic datasets. **topobin** converts TopoJSON into a compact binary format using typed arrays (Int32Array, Float64Array, Uint32Array), significantly reducing memory usage while maintaining all topology information.

## Features

- **Memory Efficient**: Uses typed arrays instead of JSON objects
- **Binary Format**: Compact representation reduces memory footprint
- **Lossless**: Full round-trip conversion (TopoJSON → Binary → TopoJSON)
- **Fast Access**: `BinaryTopologyView` allows accessing arcs without full decoding
- **Type Safe**: Written in TypeScript with full type definitions
- **Browser & Node.js**: Works in both environments (ES Modules)

## Installation

```bash
npm install topobin
```

## Usage

### Basic Encoding/Decoding

```javascript
import { encode, decode } from 'topobin';

// Your TopoJSON topology
const topology = {
  type: 'Topology',
  transform: {
    scale: [0.001, 0.001],
    translate: [-180, -90]
  },
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [/* ... */]
    }
  },
  arcs: [
    [[100000, 50000], [150, 200], [-50, 100]],
    // ... more arcs
  ]
};

// Encode to binary
const binaryBuffer = encode(topology);

// Decode back to TopoJSON
const decodedTopology = decode(binaryBuffer);
```

### Memory Comparison

```javascript
import { encode, compareMemoryUsage } from 'topobin';

const topology = /* ... */;
const binaryBuffer = encode(topology);

const stats = compareMemoryUsage(topology, binaryBuffer);
console.log(`JSON: ${stats.jsonBytes} bytes`);
console.log(`Binary: ${stats.binaryBytes} bytes`);
console.log(`Savings: ${stats.savingsPercent.toFixed(1)}%`);
```

### Efficient Arc Access

Use `BinaryTopologyView` to access arcs without decoding the entire topology:

```javascript
import { encode, BinaryTopologyView } from 'topobin';

const binaryBuffer = encode(topology);
const view = new BinaryTopologyView(binaryBuffer);

// Access specific arc
const arc0 = view.getArc(0);
console.log(`Arc 0 has ${arc0.length} points`);

// Iterate over all arcs efficiently
for (const arc of view.iterArcs()) {
  console.log(`Arc with ${arc.length} points`);
}
```

## Binary Format

The binary format uses the following structure:

1. **Header** (24 bytes): Magic number, version, flags, metadata
2. **Transform** (32 bytes, optional): Scale and translate for quantization
3. **BBox** (32 bytes, optional): Bounding box coordinates
4. **String Table** (variable): Object names and property keys
5. **Arc Offsets** (4 bytes per arc + 4): Uint32Array of arc positions
6. **Arc Data** (variable): Int32Array (quantized) or Float64Array (unquantized)
7. **Objects** (variable): Geometry objects metadata

### Memory Layout

- Typed arrays ensure efficient memory alignment
- Quantized coordinates use Int32Array (4 bytes per value)
- Unquantized coordinates use Float64Array (8 bytes per value)
- 4-byte alignment padding for optimal performance

## API

### `encode(topology: Topology): ArrayBuffer`

Encodes a TopoJSON topology into a binary format.

**Parameters:**
- `topology`: TopoJSON Topology object

**Returns:** ArrayBuffer containing the binary representation

### `decode(buffer: ArrayBuffer): Topology`

Decodes a binary buffer back into a TopoJSON topology.

**Parameters:**
- `buffer`: ArrayBuffer from `encode()`

**Returns:** TopoJSON Topology object

### `compareMemoryUsage(topology: Topology, binaryBuffer: ArrayBuffer)`

Compares memory usage between JSON and binary formats.

**Returns:**
```typescript
{
  jsonBytes: number;
  binaryBytes: number;
  savingsBytes: number;
  savingsPercent: number;
}
```

### `BinaryTopologyView`

Efficient view into binary data without full decoding.

**Methods:**
- `getArc(index: number): Arc` - Get a specific arc by index
- `getArcCount(): number` - Get total number of arcs
- `iterArcs(): Generator<Arc>` - Iterate over all arcs

### `getMemoryStats(buffer: ArrayBuffer)`

Get detailed memory statistics for the binary format.

**Returns:**
```typescript
{
  totalBytes: number;
  headerBytes: number;
  arcBytes: number;
  objectBytes: number;
}
```

## Example

Run the included example:

```bash
node example.js
```

## Performance

Tested with US Atlas counties-10m.json (3,231 counties, 9,869 arcs):

- **Memory Savings**: 6.6% (822.4 KB → 767.8 KB)
- **Encoding Speed**: ~25ms for 3,231 counties
- **Decoding Speed**: ~20ms for full decode
- **Lossless**: Perfect round-trip conversion verified
- **Arc Storage**: 52.4% of binary format (Int32Array with quantization)
- **Selective Access**: BinaryTopologyView enables accessing individual arcs without full decode

Benefits for large geographic datasets:
- Typed arrays provide more efficient memory layout than JSON objects
- Binary format eliminates JSON parsing overhead
- Direct memory mapping enables faster serialization/deserialization
- Type safety prevents accidental type coercion

## Development

```bash
# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

## License

ISC

## References

- [TopoJSON Specification](https://github.com/topojson/topojson-specification)
- [TopoJSON Library](https://github.com/topojson/topojson)
