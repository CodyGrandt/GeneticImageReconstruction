# Project Architecture: Client-Side Evolutionary Image Reconstruction

**Role:** You are an expert Svelte and TypeScript engineer focusing on system architecture.
**Current Milestone:** "Preliminary Result 2" (Concurrency Pipeline via Web Workers).

## Current State
We successfully built a 1+1 Hill Climber in `src/App.svelte`. It loads a target image, extracts pixels, and runs a mutation/evaluation loop using `requestAnimationFrame`.

## The Problem
Running heavy $O(N)$ pixel math on the Main Thread blocks the DOM. We need to decouple the UI from the math.

## Execution Instructions (Complete Sequentially)
Do NOT rewrite the entire project from scratch. Refactor the existing code to use a Web Worker architecture.

### Step 1: Create the Web Worker (`src/worker.ts`)
Create a new file to handle all the heavy lifting.
1. Move the `currentPainting` state (the array of 50 shapes) into this file.
2. Move the `evolve` mutation logic and the `calculateRMSE` execution into this file.
3. **Communication Setup:** Add a `self.onmessage` listener to handle incoming commands:
   - `INIT`: Receives the `targetPixels` (Uint8ClampedArray) from the main thread.
   - `START` / `STOP`: Controls the evolutionary loop.
   - `SET_ITERATIONS`: Updates how many mutations run before posting a message.
4. **The Loop:** Inside the Worker's loop, run the mutations $X$ times, then use `postMessage` to send an `UPDATE` payload back to the main thread containing: `bestPainting` (the shapes array), `bestScore` (RMSE), and `generation`.

### Step 2: Refactor the Main Thread (`src/App.svelte`)
Strip the math out of the main UI thread.
1. Keep the DOM elements, Canvas render logic (`draw()`), and the image pixel extraction via `OffscreenCanvas` on `onMount`.
2. Instantiate the Web Worker: `const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });`
3. Once `targetPixels` are extracted, send them to the worker: `worker.postMessage({ type: 'INIT', targetPixels });`
4. Replace the old Start/Stop button logic and Iterations Slider logic so they now send `START`, `STOP`, and `SET_ITERATIONS` messages to the worker.
5. Add a listener: `worker.onmessage = (e) => { ... }`. When it receives an `UPDATE` message, update the Svelte state variables (`score`, `generation`, `shapesToDraw`) and call `draw()` to render the new shapes to the visible canvas.

### Step 3: Type Safety (`src/types.ts`)
1. Create a `types.ts` file if one doesn't exist, and ensure the `Gene` interface is exported so both `App.svelte` and `worker.ts` can import it cleanly.
2. Define strict TypeScript interfaces for the Worker Message payloads to prevent communication bugs between threads.