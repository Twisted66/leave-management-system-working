
import { api } from "encore.dev/api";
import { Service } from "encore.dev/service";

export default new Service("frontend");

// Configure frontend with proper asset prefix
export const app = api.frontend({
  path: "./dist",
  assetPrefix: "/frontend/assets/",
});
