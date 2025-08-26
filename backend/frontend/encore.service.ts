
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Serve static assets for /assets/* requests
export const assets = api.static({
  path: "/assets/*path",
  expose: true,
  dir: "./dist/assets",
});

// Serve frontend app only for non-API routes  
export const frontend = api.static({
  path: "/!path",
  expose: true,
  dir: "./dist",
  notFound: "./dist/index.html",
  notFoundStatus: 200,
});
