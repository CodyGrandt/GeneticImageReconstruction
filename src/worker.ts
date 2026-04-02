import { calculateRMSE } from './fitness';
import type { Gene, WorkerInMessage, WorkerOutMessage } from './types';

let targetPixels: Uint8ClampedArray | null = null;
let bestScore = Infinity;
let generation = 0;
let isRunning = false;
let iterationsPerBatch = 100;
let loopTimeout: ReturnType<typeof setTimeout> | null = null;

const evalCanvas = new OffscreenCanvas(200, 200);
const evalCtx = evalCanvas.getContext('2d')!;

let currentPainting: Gene[] = Array.from({ length: 50 }, () => ({
  x: Math.random() * 400,
  y: Math.random() * 400,
  radius: Math.random() * 40 + 10,
  red: Math.floor(Math.random() * 256),
  green: Math.floor(Math.random() * 256),
  blue: Math.floor(Math.random() * 256),
  alpha: Math.random() * 0.5 + 0.1,
}));

function renderGenes(genes: Gene[]) {
  const sx = 200 / 400;
  const sy = 200 / 400;
  evalCtx.clearRect(0, 0, 200, 200);
  evalCtx.fillStyle = '#f0f0f0';
  evalCtx.fillRect(0, 0, 200, 200);
  for (const gene of genes) {
    evalCtx.beginPath();
    evalCtx.arc(gene.x * sx, gene.y * sy, gene.radius * sx, 0, Math.PI * 2);
    evalCtx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
    evalCtx.fill();
  }
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

  const msg: WorkerOutMessage = {
    type: 'UPDATE',
    bestPainting: currentPainting,
    bestScore,
    generation,
  };
  self.postMessage(msg);

  if (isRunning) {
    loopTimeout = setTimeout(runBatch, 0);
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'INIT':
      isRunning = false;
      if (loopTimeout !== null) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
      }
      targetPixels = msg.targetPixels;
      bestScore = Infinity;
      generation = 0;
      currentPainting = Array.from({ length: 50 }, () => ({
        x: Math.random() * 400,
        y: Math.random() * 400,
        radius: Math.random() * 40 + 10,
        red: Math.floor(Math.random() * 256),
        green: Math.floor(Math.random() * 256),
        blue: Math.floor(Math.random() * 256),
        alpha: Math.random() * 0.5 + 0.1,
      }));
      break;
    case 'START':
      if (!isRunning) {
        isRunning = true;
        runBatch();
      }
      break;
    case 'STOP':
      isRunning = false;
      if (loopTimeout !== null) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
      }
      break;
    case 'SET_ITERATIONS':
      iterationsPerBatch = msg.count;
      break;
  }
};
