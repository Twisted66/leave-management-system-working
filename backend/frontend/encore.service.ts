
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Use CDN-enabled HTML file as fallback
export const frontend = api.static({
  path: "/frontend/*path", 
  expose: true,
  dir: "dist",
  notFound: "dist/index-cdn.html",
  notFoundStatus: 200,
});
