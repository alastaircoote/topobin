/**
 * Shared constants for the binary TopoJSON format
 */

/** Magic number identifying TopoJSON binary format: "TOPO" in ASCII */
export const MAGIC = 0x544F504F;

/** Current binary format version */
export const VERSION = 1;

/** Minimum supported version for backward compatibility */
export const MIN_SUPPORTED_VERSION = 1;

/** Maximum supported version (current version) */
export const MAX_SUPPORTED_VERSION = 1;

/** Flag bits */
export const FLAG_HAS_TRANSFORM = 1 << 0;
export const FLAG_HAS_BBOX = 1 << 1;
