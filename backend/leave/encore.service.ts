import { Service } from "encore.dev/service";
import { initializeCronJobs } from "./cron_jobs";

export default new Service("leave");

// Initialize cron jobs when service starts
initializeCronJobs();
