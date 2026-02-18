<script lang="ts">
  import { onMount } from 'svelte';

  interface Gene {
    x: number; y: number; radius: number;
    r: number; g: number; b: number; a: number;
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;

  // Initialize 50 random shapes
  let shapes: Gene[] = Array.from({ length: 50 }, () => ({
    x: Math.random() * 400, y: Math.random() * 400,
    radius: Math.random() * 40 + 10,
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
    a: Math.random() * 0.5 + 0.1
  }));

  // The continuous render & mutation loop
  function loop() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, 400, 400);

    shapes.forEach(gene => {
      // Mock mutation (jitter)
      gene.x += (Math.random() - 0.5) * 10;
      gene.y += (Math.random() - 0.5) * 10;

      // Draw shape
      ctx!.beginPath();
      ctx!.arc(gene.x, gene.y, gene.radius, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${gene.r}, ${gene.g}, ${gene.b}, ${gene.a})`;
      ctx!.fill();
    });

    requestAnimationFrame(loop);
  }

  // Start the engine when the component loads
  onMount(() => {
    ctx = canvas.getContext('2d');
    loop();
  });
</script>

<canvas 
  bind:this={canvas} 
  width="400" 
  height="400" 
  style="border: 2px solid #333; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
></canvas>