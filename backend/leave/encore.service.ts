import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("leave");

// Frontend serving with corrected deployment paths
export const frontendAssets = api.static({
  path: "/frontend/assets/*path",
  expose: true,
  dir: "./static/assets",
});

export const frontendApp = api.static({
  path: "/frontend/*path",
  expose: true,
  dir: "./static",
  notFound: "./static/index.html",
  notFoundStatus: 200,
});
