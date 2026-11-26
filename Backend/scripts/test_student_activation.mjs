import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import routes from "../routes/studentRoutes.js";
import { StudentRoster } from "../models/StudentRoster.js";
import { Student } from "../models/Student.js";
import { errorHandler } from "../middlewares/errorHandler.js";

test("activate once and log in with email or MIS", { skip: !process.env.ACTIVATION_TEST_PORT }, async t => {
  const port = Number(process.env.ACTIVATION_TEST_PORT);
  assert.ok(Number.isInteger(port) && port > 0 && port < 65536);
  const database = "activation_test_" + randomUUID().replaceAll("-", "");
  await mongoose.connect("mongodb://127.0.0.1:" + port + "/" + database, { directConnection: true });
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  Object.assign(process.env, { PUBLIC_APP_URL: "https://portal.example", ACTIVATION_FROM: "pilot@example.test",
    RESEND_API_KEY: "fixture", JWT_SECRET: randomUUID() });
  const http = globalThis.fetch;
  const messages = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    messages.push(JSON.parse(options.body));
    return { ok: true };
  });
  const app = express();
  app.use(express.json(), routes, errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (path, body) => http(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const id = { email: "pilot@iiitp.ac.in", mis: "0001" };
  const password = "disposable student pass";
  const roster = await StudentRoster.create({ ...id, name: "Pilot", department: "CSE", semester: 5 });
  assert.equal((await post("/signup", { ...id, mis: "0002" })).status, 202);
  assert.equal(messages.length, 0);
  const requestLink = async () => {
    assert.equal((await post("/signup", id)).status, 202);
    assert.deepEqual(messages.at(-1).to, [id.email]);
    return messages.at(-1).text.split("#").at(-1);
  };
  const first = await requestLink();
  await requestLink();
  assert.equal(messages.length, 1);
  await StudentRoster.updateOne({ _id: roster.id }, { sentAt: new Date(0), expiresAt: new Date(0) });
  assert.equal((await post("/activate", { token: first, password })).status, 400);
  const second = await requestLink();
  assert.notEqual(second, first);
  assert.equal((await post("/activate", { token: first, password })).status, 400);
  const attempts = await Promise.all([1, 2].map(() => post("/activate", { token: second, password, semester: 1 })));
  assert.deepEqual(attempts.map(r => r.status).sort(), [201, 400]);
  const account = await Student.findOne(id);
  assert.equal(account.currentSemester, 5);
  assert.ok(account.emailVerifiedAt);
  for (const identity of [{ email: id.email }, { mis: id.mis }]) {
    assert.equal((await post("/login", { ...identity, password })).status, 200);
  }
});
