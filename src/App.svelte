<script lang="ts">
  import { onMount } from 'svelte';
  import type { Gene, WorkerInMessage, WorkerOutMessage } from './types';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let generation = 0;
  let isRunning = false;
  let bestScore = Infinity;
  let iterationsPerFrame = 100;
  let shapesToDraw: Gene[] = [];

  let worker: Worker;

  function draw() {
    if (!ctx) return;
    const sx = 400 / 400;
    const sy = 400 / 400;
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 400);
    for (const gene of shapesToDraw) {
      ctx.beginPath();
      ctx.arc(gene.x * sx, gene.y * sy, gene.radius * sx, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
      ctx.fill();
    }
  }

  function toggle() {
    isRunning = !isRunning;
    const msg: WorkerInMessage = { type: isRunning ? 'START' : 'STOP' };
    worker.postMessage(msg);
  }

  function onIterationsChange() {
    const msg: WorkerInMessage = { type: 'SET_ITERATIONS', count: iterationsPerFrame };
    worker.postMessage(msg);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    draw();

    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === 'UPDATE') {
        shapesToDraw = msg.bestPainting;
        bestScore = msg.bestScore;
        generation = msg.generation;
        draw();
      }
    };

    const img = document.getElementById('target-image') as HTMLImageElement;
    const loadPixels = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 200;
      offscreen.height = 200;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(img, 0, 0, 200, 200);
      const targetPixels = offCtx.getImageData(0, 0, 200, 200).data;
      console.log('targetPixels length:', targetPixels.length);
      const initMsg: WorkerInMessage = { type: 'INIT', targetPixels };
      worker.postMessage(initMsg, [targetPixels.buffer]);
    };

    if (img.complete) {
      loadPixels();
    } else {
      img.addEventListener('load', loadPixels);
    }
  });
</script>

<img src="/target.jpg" id="target-image" crossorigin="anonymous" style="display: none;" alt="target" />
<main style="text-align: center; font-family: sans-serif; padding: 20px;">
  <h2>Genetic Image Reconstruction</h2>
  <p><strong>Generation:</strong> {generation} &nbsp;|&nbsp; <strong>Score (RMSE):</strong> {bestScore === Infinity ? '—' : bestScore.toFixed(2)}</p>

  <canvas
    bind:this={canvas}
    width="400"
    height="400"
    style="border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
  ></canvas>

  <br><br>
  <label style="font-size: 14px;">
    <strong>Iterations/batch:</strong> {iterationsPerFrame}
    <br>
    <input type="range" min="1" max="1000" step="1" bind:value={iterationsPerFrame} on:input={onIterationsChange} style="width: 200px;" />
  </label>
  <br><br>
  <button
    on:click={toggle}
    style="padding: 10px 20px; font-size: 16px; cursor: pointer;"
  >
    {isRunning ? 'Stop Engine' : 'Start Engine'}
  </button>
</main>
