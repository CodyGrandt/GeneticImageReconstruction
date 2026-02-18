<script lang="ts">
  import { onMount } from 'svelte';

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

  // 4. Prove the HTML5 Canvas rendering works
  function draw() {
    if (!ctx) return;
    
    // Clear background
    ctx.clearRect(0, 0, 400, 400);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 400);

    // Draw all shapes
    currentPainting.forEach(gene => {
      ctx.beginPath();
      ctx.arc(gene.x, gene.y, gene.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${gene.red}, ${gene.green}, ${gene.blue}, ${gene.alpha})`;
      ctx.fill();
    });
  }

  // 5. Prove the update loop works (Mock Mutation)
  function mockEvolve() {
    // Randomly jitter shapes to simulate movement/mutation
    currentPainting.forEach(gene => {
      gene.x += (Math.random() - 0.5) * 10;
      gene.y += (Math.random() - 0.5) * 10;
    });
    
    generation++;
    draw();

    if (isRunning) {
      animationId = requestAnimationFrame(mockEvolve);
    }
  }

  function toggle() {
    isRunning = !isRunning;
    if (isRunning) mockEvolve();
    else cancelAnimationFrame(animationId);
  }

  // Hook into Svelte's lifecycle
  onMount(() => {
    ctx = canvas.getContext('2d');
    draw();
  });
</script>

<main style="text-align: center; font-family: sans-serif; padding: 20px;">
  <h2>Environment Test: Svelte + Canvas API</h2>
  <p><strong>Generation:</strong> {generation}</p>
  
  <canvas 
    bind:this={canvas} 
    width="400" 
    height="400" 
    style="border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
  ></canvas>
  
  <br><br>
  <button 
    on:click={toggle} 
    style="padding: 10px 20px; font-size: 16px; cursor: pointer;"
  >
    {isRunning ? 'Stop Engine' : 'Start Engine'}
  </button>
</main>