import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

// Define the frontend service
export default new Service("frontend");

// Serve the React SPA using Encore's static file serving
// This uses the optimized Rust runtime for zero JavaScript overhead
export const frontend = api.static({
  expose: true,
  path: "/!path",
  dir: "./static",
});
