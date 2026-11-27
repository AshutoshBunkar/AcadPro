import { publicOrigin } from "./utils/config.js";
import { mailProvider } from "./utils/challenges.js";
import http from "http";
import app from "./app.js";

import mongoose from "mongoose";
import { validateConfig } from "./utils/config.js";
import { configureAdmin } from "./utils/fixedAdmin.js";
validateConfig();
await mongoose.connect(process.env.MONGO_DB_URL);
await configureAdmin();
const port = process.env.PORT || 10000;

const server = http.createServer(app);

server.listen(port, () => {
  console.info("acadpro_ready", { port: server.address().port, database: mongoose.connection.name, browserOrigin: publicOrigin(), mailProvider: mailProvider() });
});