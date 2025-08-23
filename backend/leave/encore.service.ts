import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("leave");

// Emergency frontend serving from leave service
export const frontendAssets = api.static({
  path: "/frontend/assets/*path",
  expose: true,
  dir: "../static/assets",
});

export const frontendApp = api.static({
  path: "/frontend/*path",
  expose: true,
  dir: "../static",
  notFound: "../static/index.html",
  notFoundStatus: 200,
});
