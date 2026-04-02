export interface Gene {
  x: number;
  y: number;
  radius: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export type ShapeType = 'circle' | 'rect' | 'triangle';

// Messages sent TO the worker (main thread → worker)
export type WorkerInMessage =
  | { type: 'INIT'; targetPixels: Uint8ClampedArray }
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'SET_ITERATIONS'; count: number }
  | { type: 'SET_NUM_SHAPES'; count: number }
  | { type: 'SET_SHAPE_TYPE'; shapeType: ShapeType };

// Messages sent FROM the worker (worker → main thread)
export type WorkerOutMessage =
  | { type: 'UPDATE'; bestPainting: Gene[]; bestScore: number; generation: number };
