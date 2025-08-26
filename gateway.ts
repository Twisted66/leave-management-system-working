import { Gateway } from "encore.dev/api";
import { authHandlerImpl } from "./backend/leave/auth";

export default new Gateway({
  authHandler: authHandlerImpl,
});
