import { SQLDatabase } from "encore.dev/storage/sqldb";
export const leaveDB = new SQLDatabase("leave", {
    migrations: "./migrations",
});
//# sourceMappingURL=db.js.map