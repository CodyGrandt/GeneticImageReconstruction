<script lang="ts">
  import { onMount } from 'svelte';
  import type { Gene, ShapeType, WorkerInMessage, WorkerOutMessage } from './types';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let generation = 0;
  let isRunning = false;
  let bestScore = Infinity;
  let iterationsPerFrame = 100;
  let numShapes = 50;
  let shapeType: ShapeType = 'circle';
  let shapesToDraw: Gene[] = [];
  let imagePreviewUrl: string | null = null;

  let worker: Worker;

  function drawShape(gene: Gene) {
    if (!ctx) return;
    ctx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
    const { x, y, radius: r } = gene;
    if (shapeType === 'circle') {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (shapeType === 'rect') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(x,           y - r);
      ctx.lineTo(x + r * 0.866, y + r * 0.5);
      ctx.lineTo(x - r * 0.866, y + r * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 400);
    for (const gene of shapesToDraw) drawShape(gene);
  }

  function toggle() {
    isRunning = !isRunning;
    worker.postMessage({ type: isRunning ? 'START' : 'STOP' } as WorkerInMessage);
  }

  function onIterationsChange() {
    worker.postMessage({ type: 'SET_ITERATIONS', count: iterationsPerFrame } as WorkerInMessage);
  }

  function onNumShapesChange() {
    worker.postMessage({ type: 'SET_NUM_SHAPES', count: numShapes } as WorkerInMessage);
  }

  function onShapeTypeChange() {
    worker.postMessage({ type: 'SET_SHAPE_TYPE', shapeType } as WorkerInMessage);
    draw();
  }

  function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (isRunning) {
      isRunning = false;
      worker.postMessage({ type: 'STOP' } as WorkerInMessage);
    }

    generation = 0;
    bestScore = Infinity;
    shapesToDraw = [];
    draw();

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = URL.createObjectURL(file);

    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 200;
      offscreen.height = 200;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(img, 0, 0, 200, 200);
      const targetPixels = offCtx.getImageData(0, 0, 200, 200).data;
      worker.postMessage({ type: 'INIT', targetPixels } as WorkerInMessage, [targetPixels.buffer]);
    };
    img.src = imagePreviewUrl;
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
  });
</script>

<main style="text-align: center; font-family: sans-serif; padding: 20px;">
  <h2>Genetic Image Reconstruction</h2>

  <!-- Controls row -->
  <div style="display: inline-flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">

    <label style="font-size: 14px;">
      <strong>Upload target image:</strong><br>
      <input type="file" accept="image/*" on:change={onFileChange} style="margin-top: 6px;" />
    </label>

    <label style="font-size: 14px;">
      <strong>Shape type:</strong><br>
      <select bind:value={shapeType} on:change={onShapeTypeChange} style="margin-top: 6px; font-size: 14px; padding: 4px 8px;">
        <option value="circle">Circle</option>
        <option value="rect">Rectangle</option>
        <option value="triangle">Triangle</option>
      </select>
    </label>

    <label style="font-size: 14px;">
      <strong>Shapes: {numShapes}</strong><br>
      <input type="range" min="5" max="200" step="5" bind:value={numShapes} on:input={onNumShapesChange} style="width: 160px; margin-top: 6px;" />
    </label>

    <label style="font-size: 14px;">
      <strong>Iterations/batch: {iterationsPerFrame}</strong><br>
      <input type="range" min="1" max="1000" step="1" bind:value={iterationsPerFrame} on:input={onIterationsChange} style="width: 160px; margin-top: 6px;" />
    </label>

  </div>

  <!-- Canvases -->
  <div style="display: inline-flex; gap: 24px; align-items: flex-start;">
    {#if imagePreviewUrl}
      <div>
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Target</div>
        <img
          src={imagePreviewUrl}
          alt="target"
          width="200"
          height="200"
          style="border: 2px solid #333; border-radius: 8px; display: block; object-fit: cover;"
        />
      </div>
    {/if}

    <div>
      {#if imagePreviewUrl}
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Reconstruction</div>
      {/if}
      <canvas
        bind:this={canvas}
        width="400"
        height="400"
        style="border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
      ></canvas>
    </div>
  </div>

  <p style="margin-top: 12px;">
    <strong>Generation:</strong> {generation} &nbsp;|&nbsp;
    <strong>Score (RMSE):</strong> {bestScore === Infinity ? '—' : bestScore.toFixed(2)}
  </p>

  <button
    on:click={toggle}
    disabled={!imagePreviewUrl}
    style="padding: 10px 20px; font-size: 16px; cursor: {imagePreviewUrl ? 'pointer' : 'not-allowed'}; opacity: {imagePreviewUrl ? '1' : '0.4'};"
  >
    {isRunning ? 'Stop Engine' : 'Start Engine'}
  </button>
</main>
