import http from "http";
import app from "./app.js";

import mongoose from "mongoose";
import { validateConfig } from "./utils/config.js";
validateConfig();
await mongoose.connect(process.env.MONGO_DB_URL);
const port = process.env.PORT || 10000;

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`App is running on ${port}`);
});