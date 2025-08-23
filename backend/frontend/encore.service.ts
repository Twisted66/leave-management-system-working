
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Serve static files with proper MIME types and fallback
export const frontend = api.static({
  path: "/frontend/*path", 
  expose: true,
  dir: "dist",
  notFound: "dist/index.html",
  notFoundStatus: 200,
});

// Serve root fallback for SPA routing
export const root = api.static({
  path: "/!path", 
  expose: true,
  dir: "dist",
  notFound: "dist/index.html",
  notFoundStatus: 200,
});
