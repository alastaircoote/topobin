# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**topobin** is a library that creates a more memory-efficient binary encoding for TopoJSON using typed arrays. It converts TopoJSON objects into a compact binary format, reducing memory usage while maintaining all topology information.

**References:**
- TopoJSON library: https://github.com/topojson/topojson
- TopoJSON specification: https://github.com/topojson/topojson-specification

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js and Browser (ES Modules)
- **Source**: `src/` directory
- **Build Output**: `lib/` directory
- **Entry Point**: `lib/index.js` (compiled from `src/index.ts`)

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript from `src/` to JavaScript in `lib/`
- **Clean**: `npm run clean` - Removes the `lib/` directory
- **Run Example**: `node example.js` - Demonstrates encoding/decoding with real US counties data
  - Downloads `counties-10m.json` from US Atlas if not present
  - Tests with 3,231 counties and 9,869 arcs
  - Shows memory comparison, performance metrics, and round-trip verification
- **Visual Example**: `npm run serve` - Starts a local server and opens the interactive D3 visualization
  - Serves `example.html` at http://localhost:8000
  - Renders the TopoJSON data using D3.js and the standard topojson library
  - Displays statistics and an interactive map of all 3,231 counties
- **Test**: `npm test` (placeholder - not yet implemented)

The TypeScript configuration includes both ES2020 and DOM libraries to support both Node.js and browser environments.

## Version Management

The binary format includes version information to ensure compatibility:
- **Current version**: 1
- **Version field**: 2-byte unsigned integer in the header
- **Version checking**: `getVersion()` and `isCompatibleVersion()` functions
- **Automatic validation**: Decoder rejects incompatible versions with clear error messages

When the format changes in future versions:
1. Increment `VERSION` in `src/constants.ts`
2. Update `MIN_SUPPORTED_VERSION` if backward compatibility is broken
3. The decoder will automatically reject incompatible files

## Architecture

The library consists of six main modules:

### `src/types.ts`
Type definitions for TopoJSON structures:
- `Topology` - Main TopoJSON topology type
- Geometry types: `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon`, `GeometryCollection`
- `Transform` - Quantization scale and translate
- `Arc` - Array of positions

### `src/encoder.ts`
Encodes TopoJSON to binary format:
- `encode(topology)` - Converts TopoJSON to ArrayBuffer
- `getMemoryStats(buffer)` - Returns memory usage breakdown
- Uses typed arrays (Int32Array for quantized, Float64Array for unquantized arcs)
- Binary format includes: header, transform, bbox, string table, arc offsets, arc data, objects

### `src/decoder.ts`
Decodes binary format back to TopoJSON:
- `decode(buffer)` - Converts ArrayBuffer to TopoJSON
- `BinaryTopologyView` - Efficient view for accessing arcs without full decode
  - `getArc(index)` - Get specific arc by index
  - `iterArcs()` - Generator for iterating all arcs

### `src/index.ts`
Main entry point that exports all public APIs and utility functions:
- `compareMemoryUsage()` - Compares JSON vs binary memory usage (both serialized and in-memory)

### `src/memory-estimate.ts`
Internal utility for estimating in-memory size of TopoJSON objects:
- `estimateTopologyMemorySize(topology)` - Estimates memory based on JavaScript's memory model
- **Not part of public API** - Used only internally by `compareMemoryUsage()` for examples
- Accounts for 64-bit floats, array overhead, and object structures

### `src/constants.ts`
Shared constants for the binary format:
- `VERSION` - Current binary format version (exported in public API)
- `MIN_SUPPORTED_VERSION` / `MAX_SUPPORTED_VERSION` - Version compatibility range
- `MAGIC` - Magic number identifying TopoJSON binary format (0x544F504F = "TOPO")
- Flag constants for format features (transform, bbox, etc.)

## Binary Format Structure

1. **Header** (24 bytes): Magic number (0x544F504F), version, flags, arc count, total points, object count, string table size
2. **Transform** (32 bytes, optional): Scale and translate as Float64
3. **BBox** (32 bytes, optional): Bounding box as 4 x Float64
4. **String Table** (variable, 4-byte aligned): Null-terminated strings for object names
5. **Arc Offsets** (Uint32Array): Position of each arc in arc data
6. **Arc Data** (Int32Array or Float64Array): Coordinate pairs for all arcs
7. **Objects** (variable): JSON-encoded geometry objects (could be optimized further)

**Important:** All sections are 4-byte aligned to ensure typed array compatibility.

## Test Data

The example uses real TopoJSON data from the US Atlas project:
- **File**: `counties-10m.json` (downloaded from https://cdn.jsdelivr.net/npm/us-atlas@3/)
- **Size**: ~842 KB (3,231 counties, 9,869 arcs)
- **Binary size**: ~768 KB (6.6% savings)
- **Features**: Quantized coordinates, bbox, transform

To download the test data:
```bash
curl -L https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json -o counties-10m.json
```

## Performance Results

Tested with counties-10m.json:
- **Encoding**: ~25ms
- **Decoding**: ~20ms
- **Serialized size savings**: 6.6% (822.4 KB → 767.8 KB)
- **In-memory savings**: 85.9% (5.30 MB → 0.75 MB)
  - The in-memory savings are much larger because JavaScript objects have significant overhead
  - ArrayBuffer stores data as raw bytes vs. 64-bit floats for each number in JSON
- **Arc data**: 52.4% of binary format (efficiently stored in Int32Array)
- **Perfect round-trip conversion verified**
