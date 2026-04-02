import { calculateRMSE } from './fitness';
import type { Gene, ShapeType, WorkerInMessage, WorkerOutMessage } from './types';

let targetPixels: Uint8ClampedArray | null = null;
let bestScore = Infinity;
let generation = 0;
let isRunning = false;
let iterationsPerBatch = 100;
let shapeType: ShapeType = 'circle';
let loopTimeout: ReturnType<typeof setTimeout> | null = null;

const evalCanvas = new OffscreenCanvas(200, 200);
const evalCtx = evalCanvas.getContext('2d')!;

function makeRandomGene(): Gene {
  return {
    x: Math.random() * 400,
    y: Math.random() * 400,
    radius: Math.random() * 40 + 10,
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: Math.random() * 0.5 + 0.1,
  };
}

let currentPainting: Gene[] = Array.from({ length: 50 }, makeRandomGene);

function drawShape(ctx: OffscreenCanvasRenderingContext2D, gene: Gene, sx: number, sy: number) {
  const x = gene.x * sx;
  const y = gene.y * sy;
  const r = gene.radius * sx;
  ctx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
  if (shapeType === 'circle') {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (shapeType === 'rect') {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else {
    // equilateral triangle, circumradius = r
    ctx.beginPath();
    ctx.moveTo(x,           y - r);
    ctx.lineTo(x + r * 0.866, y + r * 0.5);
    ctx.lineTo(x - r * 0.866, y + r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

function renderGenes(genes: Gene[]) {
  const sx = 200 / 400;
  const sy = 200 / 400;
  evalCtx.clearRect(0, 0, 200, 200);
  evalCtx.fillStyle = '#f0f0f0';
  evalCtx.fillRect(0, 0, 200, 200);
  for (const gene of genes) drawShape(evalCtx, gene, sx, sy);
}

function runBatch() {
  if (!targetPixels) return;

  for (let iter = 0; iter < iterationsPerBatch; iter++) {
    const testPainting: Gene[] = currentPainting.map(g => ({ ...g }));

    const i = Math.floor(Math.random() * testPainting.length);
    const g = testPainting[i];
    const roll = Math.floor(Math.random() * 5);
    if (roll === 0)      g.x     = Math.max(0, Math.min(400, g.x     + (Math.random() - 0.5) * 20));
    else if (roll === 1) g.y     = Math.max(0, Math.min(400, g.y     + (Math.random() - 0.5) * 20));
    else if (roll === 2) g.red   = Math.max(0, Math.min(255, g.red   + Math.round((Math.random() - 0.5) * 30)));
    else if (roll === 3) g.green = Math.max(0, Math.min(255, g.green + Math.round((Math.random() - 0.5) * 30)));
    else                 g.blue  = Math.max(0, Math.min(255, g.blue  + Math.round((Math.random() - 0.5) * 30)));

    renderGenes(testPainting);
    const currentPixels = evalCtx.getImageData(0, 0, 200, 200).data;
    const newScore = calculateRMSE(targetPixels, currentPixels);

    if (newScore < bestScore) {
      currentPainting = testPainting;
      bestScore = newScore;
    }
    generation++;
  }

  const msg: WorkerOutMessage = { type: 'UPDATE', bestPainting: currentPainting, bestScore, generation };
  self.postMessage(msg);

  if (isRunning) loopTimeout = setTimeout(runBatch, 0);
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'INIT':
      isRunning = false;
      if (loopTimeout !== null) { clearTimeout(loopTimeout); loopTimeout = null; }
      targetPixels = msg.targetPixels;
      bestScore = Infinity;
      generation = 0;
      currentPainting = Array.from({ length: currentPainting.length }, makeRandomGene);
      break;
    case 'START':
      if (!isRunning) { isRunning = true; runBatch(); }
      break;
    case 'STOP':
      isRunning = false;
      if (loopTimeout !== null) { clearTimeout(loopTimeout); loopTimeout = null; }
      break;
    case 'SET_ITERATIONS':
      iterationsPerBatch = msg.count;
      break;
    case 'SET_NUM_SHAPES': {
      const n = msg.count;
      if (n > currentPainting.length) {
        currentPainting = [...currentPainting, ...Array.from({ length: n - currentPainting.length }, makeRandomGene)];
      } else {
        currentPainting = currentPainting.slice(0, n);
      }
      break;
    }
    case 'SET_SHAPE_TYPE':
      shapeType = msg.shapeType;
      break;
  }
};
