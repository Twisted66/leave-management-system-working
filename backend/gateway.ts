import { Gateway } from "encore.dev/api";
import { authHandlerImpl } from "./leave/auth";

export default new Gateway({
  authHandler: authHandlerImpl,
});
