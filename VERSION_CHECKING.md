# Version Checking Guide

The topobin library includes built-in version checking to ensure you're using compatible binary formats.

## Basic Usage

### Check Current Library Version

```javascript
import { VERSION } from 'topobin';

console.log(`Library version: ${VERSION}`); // 1
```

### Validate a Binary Buffer Before Decoding

```javascript
import { getVersion, isCompatibleVersion, decode } from 'topobin';

// Get the version from a buffer
const version = getVersion(buffer);
console.log(`Buffer version: ${version}`); // Returns number or null

// Check if it's compatible
if (isCompatibleVersion(buffer)) {
  const topology = decode(buffer);
  // Use the decoded topology
} else {
  console.error('Incompatible binary format version');
}
```

### Automatic Version Validation

The `decode()` and `BinaryTopologyView` constructor automatically validate versions:

```javascript
import { decode } from 'topobin';

try {
  const topology = decode(buffer);
} catch (error) {
  // Will throw with message like:
  // "Unsupported binary format version 5.
  //  This library supports versions 1-1.
  //  Please upgrade the topobin library to decode this file."
}
```

## Version Constants

```javascript
import {
  VERSION,                  // Current library version (1)
  MIN_SUPPORTED_VERSION,    // Minimum version this library can decode (1)
  MAX_SUPPORTED_VERSION     // Maximum version this library can decode (1)
} from 'topobin';

console.log(`This library supports versions ${MIN_SUPPORTED_VERSION}-${MAX_SUPPORTED_VERSION}`);
```

## API Reference

### `getVersion(buffer: ArrayBuffer): number | null`

Returns the version number from a binary buffer without fully decoding it.
- **Returns**: Version number, or `null` if the buffer is not a valid TopoJSON binary format
- **Use case**: Quick validation before attempting full decode

### `isCompatibleVersion(buffer: ArrayBuffer): boolean`

Checks if a binary buffer can be decoded by this library version.
- **Returns**: `true` if compatible, `false` otherwise
- **Use case**: Pre-flight check before decoding

### Version-Related Errors

When decoding incompatible formats, you'll get clear error messages:

```
Unsupported binary format version 5.
This library supports versions 1-1.
Please upgrade the topobin library to decode this file.
```

## Future Version Compatibility

When the binary format changes:

1. **Backward compatible changes** (e.g., adding optional features):
   - Increment `VERSION`
   - Keep `MIN_SUPPORTED_VERSION` the same
   - Old files can still be decoded

2. **Breaking changes**:
   - Increment `VERSION`
   - Update `MIN_SUPPORTED_VERSION`
   - Old files cannot be decoded

## Example: Handling Multiple Versions

```javascript
import { getVersion, isCompatibleVersion, decode, VERSION } from 'topobin';
import { readFileSync, writeFileSync } from 'fs';

// Load a binary file
const buffer = readFileSync('data.topobin').buffer;

// Check version
const fileVersion = getVersion(buffer);
console.log(`File version: ${fileVersion}`);
console.log(`Library version: ${VERSION}`);

if (!isCompatibleVersion(buffer)) {
  console.error(`Cannot decode file: incompatible version ${fileVersion}`);
  console.error(`Please use topobin library version ${fileVersion} or upgrade the file format`);
  process.exit(1);
}

// Safe to decode
const topology = decode(buffer);

// If you want to upgrade old files to the current version,
// just re-encode them:
if (fileVersion < VERSION) {
  console.log('Upgrading file to current version...');
  const upgraded = encode(topology);
  writeFileSync('data-upgraded.topobin', Buffer.from(upgraded));
}
```

## Testing Version Compatibility

See `test-version.js` for comprehensive examples of version checking behavior.
