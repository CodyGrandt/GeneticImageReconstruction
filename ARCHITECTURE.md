# Project Architecture: Client-Side Evolutionary Image Reconstruction

**Role:** You are an expert Svelte and TypeScript engineer. 
**Current Milestone:** "Preliminary Result 1" (Implement a 1+1 Hill Climbing algorithm to prove the Fitness Function works).

## Current State
You already have access to `src/App.svelte`. It currently contains:
- The `Gene` interface (x, y, radius, r, g, b, alpha).
- An array of 50 shapes.
- A `draw()` function rendering to a `<canvas>`.
- A `requestAnimationFrame` loop (`mockEvolve`) that currently just "jitters" the shapes.

## Execution Instructions (Modify Existing Code)
Do NOT rewrite the entire file. Only make the following targeted updates, and complete them sequentially.

### Step 1: Target Image Pixel Extraction
**File:** `src/App.svelte`
1. Add a hidden `<img src="/target.jpg" id="target-image" crossorigin="anonymous" />` element to the DOM.
2. Inside the existing `onMount`, wait for the image to load.
3. Draw the image to a hidden, offscreen `<canvas>` that matches the image dimensions (e.g., 200x200).
4. Extract the raw pixel data using `ctx.getImageData()`.
5. Store the resulting `Uint8ClampedArray` in a new Svelte state variable named `targetPixels`.
6. `console.log` the length of `targetPixels` to verify extraction.

### Step 2: The RMSE Fitness Function
**File:** Create a new file `src/fitness.ts`
1. Write a high-performance, strictly typed function: 
   `export function calculateRMSE(targetPixels: Uint8ClampedArray, currentPixels: Uint8ClampedArray): number`
2. Loop through the flat pixel arrays. 
3. Calculate the squared difference for the Red, Green, and Blue channels. 
4. **Optimization:** Skip the Alpha channel in the math to save CPU cycles (increment your loop by 4, but only perform math on the first 3 indices).
5. Calculate and return the final Root Mean Square Error (lower is better, 0.0 is perfect).

### Step 3: The Hill Climbing Loop
**File:** `src/App.svelte`
Replace the existing `mockEvolve` jitter logic with actual evolution:
1. Track a `bestScore` state variable (initialize it at Infinity).
2. Deep clone the current array of 50 shapes to create a `testPainting`.
3. **Mutate:** Pick ONE random shape in `testPainting` and apply a small mutation (e.g., shift X/Y by a few pixels, or nudge a color channel slightly).
4. **Render:** Draw `testPainting` to a hidden offscreen canvas and extract its `currentPixels`.
5. **Evaluate:** Call `const newScore = calculateRMSE(targetPixels, currentPixels)`.
6. **Select:** If `newScore < bestScore`, keep the mutation (`currentPainting = testPainting`) and update `bestScore`. If worse, discard the `testPainting`.
7. **Draw:** Call your existing `draw()` function to render the winning `currentPainting` array to the main, visible `<canvas>`.
8. **UI:** Update the HTML to display the `bestScore` alongside the existing `generation` count.