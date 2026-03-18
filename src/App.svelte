<script lang="ts">
  import { onMount } from 'svelte';
  import { calculateRMSE } from './fitness';

  // 1. Prove TypeScript is working (Strong Typing)
  interface Gene {
    x: number;
    y: number;
    radius: number;
    red: number;
    green: number;
    blue: number;
    alpha: number;
  }

  // 2. State variables
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let generation = 0;
  let isRunning = false;
  let animationId: number;
  let targetPixels: Uint8ClampedArray | null = null;
  let bestScore = Infinity;
  let iterationsPerFrame = 100;
  const evalCanvas: HTMLCanvasElement = document.createElement('canvas');
  evalCanvas.width = 200;
  evalCanvas.height = 200;

  // 3. Initialize the "Population" (50 random shapes)
  let currentPainting: Gene[] = Array.from({ length: 50 }, () => ({
    x: Math.random() * 400,
    y: Math.random() * 400,
    radius: Math.random() * 40 + 10,
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: Math.random() * 0.5 + 0.1
  }));

  // 4. Shared render helper — draws genes scaled to any canvas size
  function renderGenes(targetCtx: CanvasRenderingContext2D, genes: Gene[], w: number, h: number) {
    const sx = w / 400;
    const sy = h / 400;
    targetCtx.clearRect(0, 0, w, h);
    targetCtx.fillStyle = '#f0f0f0';
    targetCtx.fillRect(0, 0, w, h);
    genes.forEach(gene => {
      targetCtx.beginPath();
      targetCtx.arc(gene.x * sx, gene.y * sy, gene.radius * sx, 0, Math.PI * 2);
      targetCtx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
      targetCtx.fill();
    });
  }

  function draw() {
    if (!ctx) return;
    renderGenes(ctx, currentPainting, 400, 400);
  }

  // 5. Hill Climbing Loop
  function evolve() {
    if (!targetPixels) {
      animationId = requestAnimationFrame(evolve);
      return;
    }

    const evalCtx = evalCanvas.getContext('2d')!;

    for (let iter = 0; iter < iterationsPerFrame; iter++) {
      // Deep clone current painting
      const testPainting: Gene[] = currentPainting.map(g => ({ ...g }));

      // Mutate one random shape
      const i = Math.floor(Math.random() * testPainting.length);
      const g = testPainting[i];
      const roll = Math.floor(Math.random() * 5);
      if (roll === 0) g.x = Math.max(0, Math.min(400, g.x + (Math.random() - 0.5) * 20));
      else if (roll === 1) g.y = Math.max(0, Math.min(400, g.y + (Math.random() - 0.5) * 20));
      else if (roll === 2) g.red   = Math.max(0, Math.min(255, g.red   + Math.round((Math.random() - 0.5) * 30)));
      else if (roll === 3) g.green = Math.max(0, Math.min(255, g.green + Math.round((Math.random() - 0.5) * 30)));
      else                 g.blue  = Math.max(0, Math.min(255, g.blue  + Math.round((Math.random() - 0.5) * 30)));

      // Render, evaluate, select
      renderGenes(evalCtx, testPainting, 200, 200);
      const currentPixels = evalCtx.getImageData(0, 0, 200, 200).data;
      const newScore = calculateRMSE(targetPixels, currentPixels);
      if (newScore < bestScore) {
        currentPainting = testPainting;
        bestScore = newScore;
      }

      generation++;
    }

    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(evolve);
    }
  }

  function toggle() {
    isRunning = !isRunning;
    if (isRunning) evolve();
    else cancelAnimationFrame(animationId);
  }

  // Hook into Svelte's lifecycle
  onMount(() => {
    ctx = canvas.getContext('2d');
    draw();

    const img = document.getElementById('target-image') as HTMLImageElement;
    const loadPixels = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 200;
      offscreen.height = 200;
      const offCtx = offscreen.getContext('2d')!;
      offCtx.drawImage(img, 0, 0, 200, 200);
      targetPixels = offCtx.getImageData(0, 0, 200, 200).data;
      console.log('targetPixels length:', targetPixels.length);
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
    <strong>Iterations/frame:</strong> {iterationsPerFrame}
    <br>
    <input type="range" min="1" max="1000" step="1" bind:value={iterationsPerFrame} style="width: 200px;" />
  </label>
  <br><br>
  <button
    on:click={toggle}
    style="padding: 10px 20px; font-size: 16px; cursor: pointer;"
  >
    {isRunning ? 'Stop Engine' : 'Start Engine'}
  </button>
</main>