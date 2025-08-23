
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Static assets - no fallback to HTML for asset files
export const assets = api.static({
  path: "/frontend/assets/*path",
  expose: true,
  dir: "dist/assets",
});

// SPA routing - fallback to index.html for non-asset routes
export const spa = api.static({
  path: "/frontend/*path",
  expose: true,
  dir: "dist",
  notFound: "dist/index.html",
  notFoundStatus: 200,
});
