import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";
import * as fs from "fs";

// Define the frontend service
export default new Service("frontend");

// Serve all files in the assets directory.
// This handles JS, CSS, images, etc.
// FIX 1: Use a static string literal for the directory path.
// The path is relative to the backend service root.
export const assets = api.static({
  expose: true,
  path: "/assets/*path",
  dir: "frontend/dist/assets",
});

// Serve the index.html file for all other routes.
// This is the key for Single-Page Applications (SPAs) like React.
// It ensures that client-side routing works correctly.
// FIX 2: Use a regular API endpoint to manually serve the index.html file,
// since `api.static` does not support serving a single file on a fallback.
export const serve = api({
  expose: true,
  method: "GET",
  path: "/!path",
}, async () => {
  try {
    // Read the index.html file from the location where Encore places it.
    // The path is relative to the backend service root.
    const data = fs.readFileSync("frontend/dist/index.html");
    return new Response(data, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    // If the file doesn't exist, return a 404.
    // This shouldn't happen if the build process is correct.
    return new Response("Not Found", { status: 404 });
  }
});
