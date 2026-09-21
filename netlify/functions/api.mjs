import { getDatabase } from "@netlify/database";
import { createApi } from "./lib/api-core.mjs";
import CONFIG from "./lib/study-config.mjs";
import MANIFEST from "./lib/material-manifest.mjs";

// Production uses Netlify Database exclusively. No test adapter or static fallback.
let database;
function pool() { database ||= getDatabase(); return database.pool; }
const db = { pool: { query: (...args) => pool().query(...args), connect: () => pool().connect() } };
export default createApi({ db, CONFIG, MANIFEST });
