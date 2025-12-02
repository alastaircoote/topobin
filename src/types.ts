/**
 * TopoJSON type definitions
 */

export type Position = number[];

export type Arc = Position[];

export interface Transform {
  scale: [number, number];
  translate: [number, number];
}

export type GeometryType = 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection';

export interface BaseGeometry {
  type: GeometryType;
  id?: string | number;
  properties?: Record<string, any>;
}

export interface Point extends BaseGeometry {
  type: 'Point';
  coordinates: Position;
}

export interface MultiPoint extends BaseGeometry {
  type: 'MultiPoint';
  coordinates: Position[];
}

export interface LineString extends BaseGeometry {
  type: 'LineString';
  arcs: number[];
}

export interface MultiLineString extends BaseGeometry {
  type: 'MultiLineString';
  arcs: number[][];
}

export interface Polygon extends BaseGeometry {
  type: 'Polygon';
  arcs: number[][];
}

export interface MultiPolygon extends BaseGeometry {
  type: 'MultiPolygon';
  arcs: number[][][];
}

export interface GeometryCollection extends BaseGeometry {
  type: 'GeometryCollection';
  geometries: Geometry[];
}

export type Geometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon | GeometryCollection;

export interface Topology {
  type: 'Topology';
  objects: Record<string, Geometry>;
  arcs: Arc[];
  transform?: Transform;
  bbox?: [number, number, number, number];
}

/**
 * Binary format metadata
 */
export interface BinaryTopology {
  // The binary buffer containing all data
  buffer: ArrayBuffer;
  // Metadata about the encoding
  metadata: {
    version: number;
    hasTransform: boolean;
    hasBBox: boolean;
    numArcs: number;
    numObjects: number;
  };
}
