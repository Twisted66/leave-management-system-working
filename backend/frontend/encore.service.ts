import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";
import * as path from "path";

// Define the frontend service
export default new Service("frontend");

// The directory where the frontend build artifacts are located.
const clientDir = "./frontend/dist";

// Serve all files in the assets directory.
// This handles JS, CSS, images, etc.
export const assets = api.static({
  // The `expose: true` option makes this endpoint public.
  // All other endpoints in this service will also be public by default.
  // This is what we want for a frontend service.
  expose: true,
  // The path prefix for the assets.
  // Requests to /assets/* will be served from the clientDir/assets directory.
  path: "/assets/*path",
  // The directory to serve files from.
  dir: path.join(clientDir, "assets"),
});

// Serve the index.html file for all other routes.
// This is the key for Single-Page Applications (SPAs) like React.
// It ensures that client-side routing works correctly.
export const serve = api.static({
  expose: true,
  // The `!path` parameter is a fallback route that matches any path
  // that hasn't already been matched by another endpoint.
  path: "/!path",
  // The file to serve for all matching requests.
  file: path.join(clientDir, "index.html"),
});
