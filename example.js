import { encode, decode, compareMemoryUsage, BinaryTopologyView, getMemoryStats } from './lib/index.js';
import { readFileSync } from 'fs';

console.log('=== TopoJSON Binary Encoding Example ===\n');

// Load real TopoJSON data (US Counties from US Atlas)
console.log('Loading US counties TopoJSON data...');
const topologyJSON = readFileSync('./counties-10m.json', 'utf8');
const topology = JSON.parse(topologyJSON);

const numCounties = topology.objects.counties.geometries.length;
console.log(`Loaded: ${numCounties.toLocaleString()} counties`);
console.log(`Arcs: ${topology.arcs.length.toLocaleString()}`);
console.log(`Quantized: ${!!topology.transform}`);
console.log(`BBox: ${topology.bbox ? 'Yes' : 'No'}\n`);

// Encode to binary
console.log('Encoding TopoJSON to binary format...');
const startEncode = performance.now();
const binaryBuffer = encode(topology);
const encodeTime = performance.now() - startEncode;
console.log(`Encoding took: ${encodeTime.toFixed(2)}ms\n`);

// Show memory comparison
const comparison = compareMemoryUsage(topology, binaryBuffer);
console.log('Memory Usage Comparison:');
console.log(`  JSON format:   ${comparison.jsonBytes.toLocaleString()} bytes (${(comparison.jsonBytes / 1024).toFixed(1)} KB)`);
console.log(`  Binary format: ${comparison.binaryBytes.toLocaleString()} bytes (${(comparison.binaryBytes / 1024).toFixed(1)} KB)`);
console.log(`  Savings:       ${comparison.savingsBytes.toLocaleString()} bytes (${comparison.savingsPercent.toFixed(1)}%)\n`);

// Show detailed memory breakdown
const stats = getMemoryStats(binaryBuffer);
console.log('Binary Format Breakdown:');
console.log(`  Header:  ${stats.headerBytes.toLocaleString()} bytes`);
console.log(`  Arcs:    ${stats.arcBytes.toLocaleString()} bytes (${(stats.arcBytes / stats.totalBytes * 100).toFixed(1)}%)`);
console.log(`  Objects: ${stats.objectBytes.toLocaleString()} bytes (${(stats.objectBytes / stats.totalBytes * 100).toFixed(1)}%)\n`);

// Decode back to TopoJSON
console.log('Decoding binary back to TopoJSON...');
const startDecode = performance.now();
const decodedTopology = decode(binaryBuffer);
const decodeTime = performance.now() - startDecode;
console.log(`Decoding took: ${decodeTime.toFixed(2)}ms\n`);

// Verify round-trip
console.log('Verification:');
const originalArcCount = topology.arcs.length;
const decodedArcCount = decodedTopology.arcs.length;
console.log(`  Arc count matches: ${originalArcCount === decodedArcCount} (${decodedArcCount.toLocaleString()} arcs)`);
console.log(`  Transform preserved: ${!!decodedTopology.transform}`);
console.log(`  BBox preserved: ${!!decodedTopology.bbox}`);

// Verify first arc matches
const arc0Match = JSON.stringify(topology.arcs[0]) === JSON.stringify(decodedTopology.arcs[0]);
console.log(`  First arc matches: ${arc0Match}`);

// Verify last arc matches
const lastIdx = topology.arcs.length - 1;
const arcLastMatch = JSON.stringify(topology.arcs[lastIdx]) === JSON.stringify(decodedTopology.arcs[lastIdx]);
console.log(`  Last arc matches: ${arcLastMatch}\n`);

// Demonstrate BinaryTopologyView for efficient arc access
console.log('Using BinaryTopologyView for efficient access...');
const view = new BinaryTopologyView(binaryBuffer);
console.log(`Total arcs in view: ${view.getArcCount().toLocaleString()}`);

// Access a specific arc without decoding the entire topology
const arc0 = view.getArc(0);
console.log(`Arc 0 has ${arc0.length} points`);
console.log(`First point: [${arc0[0][0]}, ${arc0[0][1]}]`);

// Show a few sample arcs
console.log(`\nSample arc sizes:`);
for (let i = 0; i < Math.min(10, view.getArcCount()); i++) {
  const arc = view.getArc(i);
  console.log(`  Arc ${i}: ${arc.length} points`);
}

console.log('\n=== Performance Summary ===');
console.log(`Encoding: ${encodeTime.toFixed(2)}ms`);
console.log(`Decoding: ${decodeTime.toFixed(2)}ms`);
console.log(`Memory Savings: ${comparison.savingsPercent.toFixed(1)}%`);
console.log(`Size Reduction: ${(comparison.jsonBytes / 1024).toFixed(1)} KB → ${(comparison.binaryBytes / 1024).toFixed(1)} KB`);

console.log('\n=== Memory-Efficient Binary Format Advantages ===');
console.log('1. Uses typed arrays (Int32Array/Float64Array) instead of JSON');
console.log('2. Compact binary representation saves memory');
console.log('3. BinaryTopologyView allows accessing arcs without full decode');
console.log('4. Ideal for large geographic datasets like US counties');
console.log('5. Fast serialization/deserialization compared to JSON.parse/stringify');
