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
  let imagePreviewUrl: string | null = null;

  let worker: Worker;

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 400);
    for (const gene of shapesToDraw) {
      ctx.beginPath();
      ctx.arc(gene.x, gene.y, gene.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
      ctx.fill();
    }
  }

  function toggle() {
    isRunning = !isRunning;
    worker.postMessage({ type: isRunning ? 'START' : 'STOP' } as WorkerInMessage);
  }

  function onIterationsChange() {
    worker.postMessage({ type: 'SET_ITERATIONS', count: iterationsPerFrame } as WorkerInMessage);
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

  <div style="margin-bottom: 16px;">
    <label style="font-size: 14px; cursor: pointer;">
      <strong>Upload target image:</strong><br>
      <input type="file" accept="image/*" on:change={onFileChange} style="margin-top: 6px;" />
    </label>
  </div>

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

  <label style="font-size: 14px;">
    <strong>Iterations/batch:</strong> {iterationsPerFrame}
    <br>
    <input type="range" min="1" max="1000" step="1" bind:value={iterationsPerFrame} on:input={onIterationsChange} style="width: 200px;" />
  </label>
  <br><br>
  <button
    on:click={toggle}
    disabled={!imagePreviewUrl}
    style="padding: 10px 20px; font-size: 16px; cursor: {imagePreviewUrl ? 'pointer' : 'not-allowed'}; opacity: {imagePreviewUrl ? '1' : '0.4'};"
  >
    {isRunning ? 'Stop Engine' : 'Start Engine'}
  </button>
</main>
