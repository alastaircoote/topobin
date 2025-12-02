# Binary Format Optimization Strategies

Current status:
- **Serialized size**: 822.4 KB (JSON) → 767.8 KB (binary) = **6.6% savings**
- **In-memory size**: 5.30 MB (JSON) → 0.75 MB (binary) = **85.9% savings**

The objects section is currently JSON-encoded and takes up **374 KB (47.6%)** of the binary format.

## Analysis of US Counties Data

- **Geometries**: 3,231 (3,121 Polygons, 110 MultiPolygons)
- **Arc references**: 19,019 total references to arcs
- **Max arc index**: 9,868 (fits in Int16: -32,768 to 32,767)
- **Properties**: Only 1 key ("name") with 1,920 unique values across 3,231 counties
- **IDs**: 3,231 unique county FIPS codes

## Optimization Strategies (Ranked by Impact)

### 1. Binary Encode Geometry Objects (**~110-150 KB savings**)

Currently the entire objects section is JSON-encoded. Binary encoding would save significantly:

**Arc references** (highest impact):
- Current: JSON encoding ≈ 152 KB (estimated)
- Using Int16Array: 38 KB
- Using Int32Array: 76 KB
- **Savings: ~114 KB** (using Int16)

**Implementation**:
```
For each geometry:
  - Type: 1 byte (0=Point, 1=MultiPoint, 2=LineString, etc.)
  - ID: reference to string table
  - Arc count: varint or Uint16
  - Arcs: Int16Array of arc indices (negative = reversed)
  - Ring counts: for MultiPolygons, array of ring counts per polygon
  - Properties: reference to property dictionary
```

### 2. Property Value Dictionary (**~30-40 KB savings**)

Since there are only 1,920 unique county names for 3,231 counties, we can use a dictionary:

- Store unique property values once in a string table
- Reference them by index (Uint16 = 2 bytes per reference)
- Current: Each county name stored inline as JSON string
- Binary: 2-byte index into dictionary

**Savings**:
- String storage: 1,920 unique values vs 3,231 repeated values
- Index overhead: 3,231 × 2 bytes = 6.5 KB
- Estimated savings: ~35 KB

### 3. Varint Encoding for Arc Indices (**~20-30 KB savings**)

Most arc indices are small numbers. Using variable-length encoding:
- 0-127: 1 byte
- 128-16,383: 2 bytes
- 16,384+: 3+ bytes

Since many arc references are consecutive and small, this could save significant space.

### 4. Delta Encoding for Arc Indices (**~10-20 KB savings**)

Store the first arc index, then store deltas (differences) between consecutive indices:
- Many geometries reference consecutive arcs
- Deltas are often 1, 2, 3, etc.
- Combined with varint encoding, very efficient

Example:
```
Original:  [100, 101, 102, 150, 151]
Delta:     [100, +1, +1, +48, +1]
Varint:    [1 byte, 1 byte, 1 byte, 1 byte, 1 byte] = 5 bytes
vs Int16:  10 bytes
```

### 5. Run-Length Encoding for Sequential Arcs (**~5-10 KB savings**)

If many geometries have sequential arc ranges (e.g., [100, 101, 102, 103]):
- Store as: start_index (2 bytes) + count (1 byte) + stride (1 byte)
- Example: `[100, 101, 102, 103]` → `{start: 100, count: 4, stride: 1}`

### 6. Specialized Encoding for Common Patterns (**~5-10 KB savings**)

Use flag bits to indicate common patterns:
- Single-ring polygons (most common): 1 bit flag, skip ring count
- Positive arc sequences: 1 bit flag, no need for sign bits
- Empty properties: 1 bit flag, skip property section

### 7. Geometry Type Compression (**~1-2 KB savings**)

Only 2 geometry types in this dataset:
- 1 bit: 0=Polygon, 1=MultiPolygon
- Or 1 byte for extensibility
- Current JSON: "Polygon" = 9 bytes, "MultiPolygon" = 14 bytes

### 8. Apply Compression (gzip/brotli) (**~50-70% additional savings**)

As a final step, compress the entire binary buffer:
- gzip: typically 50-70% compression for geographic data
- Brotli: 5-10% better than gzip
- LZ4: faster, 40-50% compression

**Note**: This changes the use case - data must be decompressed before use, losing random access benefits.

## Recommended Implementation Order

1. **Binary encode arc references** (Int16Array) - Easy win, 114 KB savings
2. **Property value dictionary** - Straightforward, 35 KB savings
3. **Binary encode geometry types** - Simple, small savings
4. **Varint or delta encoding** - More complex, 20-30 KB savings

**Potential total savings**: ~170-200 KB additional (22-26% of current binary size)
**Final binary size**: ~570-600 KB (vs 767 KB current, 822 KB JSON)
**Total improvement over JSON**: ~27-31% (vs current 6.6%)

## Trade-offs

**Complexity vs Savings**:
- Simple binary encoding: Medium effort, ~150 KB savings
- Advanced encoding (varint/delta): High effort, ~30-50 KB more savings
- Compression: Trivial to add, ~50-70% savings but loses random access

**Random Access**:
- Current format: Can access individual arcs via BinaryTopologyView
- With compression: Must decompress entire buffer first
- Recommendation: Offer both compressed and uncompressed variants

## Example: Simple Binary Geometry Encoding

```typescript
interface BinaryGeometry {
  type: Uint8;           // 1 byte
  id: Uint16;            // 2 bytes (index into string table)
  arcCount: Uint16;      // 2 bytes
  arcs: Int16Array;      // 2 bytes per arc reference
  ringCounts?: Uint8Array; // For MultiPolygons
  propertyNameIdx: Uint16;  // 2 bytes (index into property dict)
}
```

For a typical Polygon with 12 arc references:
- JSON: ~120 bytes (estimated)
- Binary: 1 + 2 + 2 + (12 × 2) + 2 = 31 bytes
- **Savings: ~74%** per geometry
