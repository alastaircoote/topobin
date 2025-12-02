import { getVersion, isCompatibleVersion, decode, VERSION, MIN_SUPPORTED_VERSION, MAX_SUPPORTED_VERSION } from './lib/index.js';

console.log('=== Version Checking Tests ===\n');

console.log(`Current library version: ${VERSION}`);
console.log(`Supported version range: ${MIN_SUPPORTED_VERSION}-${MAX_SUPPORTED_VERSION}\n`);

// Test 1: Valid buffer
console.log('Test 1: Valid binary buffer');
const validBuffer = new ArrayBuffer(24);
const validView = new DataView(validBuffer);
validView.setUint32(0, 0x544F504F, false); // MAGIC
validView.setUint16(4, 1, false); // VERSION = 1
console.log(`  Version: ${getVersion(validBuffer)}`);
console.log(`  Compatible: ${isCompatibleVersion(validBuffer)}`);
console.log(`  ✓ Should be compatible\n`);

// Test 2: Future version
console.log('Test 2: Future version (version 5)');
const futureBuffer = new ArrayBuffer(24);
const futureView = new DataView(futureBuffer);
futureView.setUint32(0, 0x544F504F, false); // MAGIC
futureView.setUint16(4, 5, false); // VERSION = 5
console.log(`  Version: ${getVersion(futureBuffer)}`);
console.log(`  Compatible: ${isCompatibleVersion(futureBuffer)}`);
console.log(`  ✓ Should be incompatible (version too new)\n`);

// Test 3: Try to decode future version (should throw error)
console.log('Test 3: Attempting to decode future version');
try {
  decode(futureBuffer);
  console.log('  ✗ ERROR: Should have thrown an error!\n');
} catch (error) {
  console.log(`  ✓ Correctly rejected: ${error.message}\n`);
}

// Test 4: Invalid magic number
console.log('Test 4: Invalid magic number');
const invalidBuffer = new ArrayBuffer(24);
const invalidView = new DataView(invalidBuffer);
invalidView.setUint32(0, 0x12345678, false); // Wrong magic
invalidView.setUint16(4, 1, false);
console.log(`  Version: ${getVersion(invalidBuffer)}`);
console.log(`  Compatible: ${isCompatibleVersion(invalidBuffer)}`);
console.log(`  ✓ Should be null/incompatible (wrong magic number)\n`);

// Test 5: Buffer too small
console.log('Test 5: Buffer too small');
const tinyBuffer = new ArrayBuffer(4);
console.log(`  Version: ${getVersion(tinyBuffer)}`);
console.log(`  Compatible: ${isCompatibleVersion(tinyBuffer)}`);
console.log(`  ✓ Should be null/incompatible (buffer too small)\n`);

console.log('=== All version checking tests completed ===');
