
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Serve static assets from backend/static directory
export const assets = api.static({
  path: "/frontend/assets/*path", 
  expose: true,
  dir: "../static/assets",
});

// Serve frontend SPA from backend/static directory  
export const frontend = api.static({
  path: "/frontend/*path", 
  expose: true,
  dir: "../static",
  notFound: "../static/index.html",
  notFoundStatus: 200,
});
