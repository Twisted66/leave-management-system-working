
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Serve static assets with explicit MIME type handling
export const assets = api.static({
  path: "/frontend/assets/*path", 
  expose: true,
  dir: "dist/assets",
});

// Serve frontend app with SPA fallback
export const frontend = api.static({
  path: "/frontend/*path", 
  expose: true,
  dir: "dist",
  notFound: "dist/index.html",
  notFoundStatus: 200,
});

// Serve root with SPA fallback for direct navigation
export const root = api.static({
  path: "/!path", 
  expose: true,
  dir: "dist",
  notFound: "dist/index.html", 
  notFoundStatus: 200,
});
