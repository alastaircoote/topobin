# Tests

This directory contains tests for the topobin library using Node.js's built-in test runner.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

## Test Files

### `version.test.js`
Tests version checking functionality:
- Version constant validation
- `getVersion()` with valid and invalid buffers
- `isCompatibleVersion()` compatibility checking
- Error handling for incompatible versions
- Magic number validation

### `encode-decode.test.js`
Tests core encoding and decoding functionality:
- Simple topology round-trip
- Topologies with transform (quantized coordinates)
- Topologies with bbox
- Arc data preservation
- `BinaryTopologyView` for efficient arc access
- Iterator functionality
- Memory stats calculation
- Empty arc arrays
- Edge cases

### `memory.test.js`
Tests memory usage estimation:
- `compareMemoryUsage()` function
- Serialized size comparisons
- In-memory size estimations
- Percentage calculations
- Savings verification for large datasets

## Test Coverage

Current coverage:
- ✅ Encoding and decoding
- ✅ Version checking
- ✅ Binary format validation
- ✅ Arc data access
- ✅ Memory estimation
- ✅ Error handling
- ✅ Edge cases

## Writing New Tests

Tests use Node.js's built-in test runner (`node:test` module):

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('description of what you are testing', () => {
  // Your test code here
  assert.strictEqual(actual, expected);
});
```

See existing test files for examples.

## Test Requirements

- Node.js v18+ (for stable test runner)
- The library must be built (`npm run build`) before running tests
- Tests import from `../lib/index.js` (compiled output)
