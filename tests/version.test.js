import { test } from 'node:test';
import assert from 'node:assert';
import {
  getVersion,
  isCompatibleVersion,
  decode,
  VERSION,
  MIN_SUPPORTED_VERSION,
  MAX_SUPPORTED_VERSION
} from '../lib/index.js';

test('version constants are defined', () => {
  assert.strictEqual(typeof VERSION, 'number');
  assert.strictEqual(typeof MIN_SUPPORTED_VERSION, 'number');
  assert.strictEqual(typeof MAX_SUPPORTED_VERSION, 'number');
  assert.ok(MIN_SUPPORTED_VERSION <= MAX_SUPPORTED_VERSION);
});

test('getVersion returns correct version for valid buffer', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x544F504F, false); // MAGIC
  view.setUint16(4, 1, false); // VERSION = 1

  const version = getVersion(buffer);
  assert.strictEqual(version, 1);
});

test('getVersion returns null for invalid magic number', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x12345678, false); // Wrong magic
  view.setUint16(4, 1, false);

  const version = getVersion(buffer);
  assert.strictEqual(version, null);
});

test('getVersion returns null for buffer too small', () => {
  const buffer = new ArrayBuffer(4);
  const version = getVersion(buffer);
  assert.strictEqual(version, null);
});

test('isCompatibleVersion returns true for current version', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x544F504F, false); // MAGIC
  view.setUint16(4, VERSION, false);

  assert.strictEqual(isCompatibleVersion(buffer), true);
});

test('isCompatibleVersion returns false for future version', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x544F504F, false); // MAGIC
  view.setUint16(4, 999, false); // VERSION = 999

  assert.strictEqual(isCompatibleVersion(buffer), false);
});

test('isCompatibleVersion returns false for invalid buffer', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x12345678, false); // Wrong magic

  assert.strictEqual(isCompatibleVersion(buffer), false);
});

test('decode throws error for incompatible version', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x544F504F, false); // MAGIC
  view.setUint16(4, 999, false); // VERSION = 999

  assert.throws(
    () => decode(buffer),
    /Unsupported binary format version/
  );
});

test('decode throws error for invalid magic number', () => {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, 0x12345678, false); // Wrong magic

  assert.throws(
    () => decode(buffer),
    /Invalid TopoJSON binary format: bad magic number/
  );
});
