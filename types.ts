
export interface Point {
  x: number;
  y: number;
}

export interface CanvasImage {
  id: string;
  src: string; // Base64 or URL
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface DrawingPath {
  color: string;
  width: number;
  points: Point[];
}

export interface Frame {
  id: string;
  images: CanvasImage[];
  paths: DrawingPath[];
  backgroundColor: string;
}

export enum ToolType {
  MOVE = 'MOVE',
  PEN = 'PEN',
  ERASER = 'ERASER'
}

export interface ExportSettings {
  fps: number;
  width: number;
  height: number;
}
