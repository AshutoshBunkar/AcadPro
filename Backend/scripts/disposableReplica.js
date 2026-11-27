import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, cp } from "node:fs/promises";
import mongoose from "mongoose";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function availablePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
export async function disposableReplica() {
  const root = await mkdtemp(path.join(os.tmpdir(), "acadpro-fixture-"));
  const port = await availablePort();
  const host = "127.0.0.1:" + port;
  const uri = "mongodb://" + host + "/acadpro_fixture?replicaSet=acadpro";
  const db = path.join(root, "db");
  await mkdir(db);
  const binary = process.env.MONGOD_BIN || "mongod";
  let proc;
  async function launch(folder) {
    proc = spawn(binary, ["--bind_ip", "127.0.0.1", "--port", String(port), "--dbpath", folder, "--replSet", "acadpro",
      "--logpath", path.join(root, "mongo.log"), "--logappend"], { windowsHide: true, stdio: "ignore" });
    let failure;
    proc.once("error", err => { failure = err; });
    for (let i = 0; i < 50; i++) {
      if (failure || proc.exitCode !== null) throw Error("Cannot start the disposable MongoDB replica. Set MONGOD_BIN to mongod.");
      const client = new mongoose.mongo.MongoClient("mongodb://" + host, { directConnection: true, serverSelectionTimeoutMS: 500 });
      try {
        await client.connect();
        if (folder === db) await client.db("admin").command({ replSetInitiate: { _id: "acadpro", members: [{ _id: 0, host }] } });
        return;
      } catch (error) {
        if (error.code === 23) return;
        if (error.message.includes("EACCES")) throw Error("Local database connection denied by the runtime.");
      }
      finally { await client.close(); }
      await pause(150);
    }
    throw Error("Disposable MongoDB did not become ready.");
  }
  async function stop() {
    if (!proc || proc.exitCode !== null || !proc.pid) return;
    const ended = new Promise(resolve => proc.once("exit", resolve));
    const client = new mongoose.mongo.MongoClient("mongodb://" + host, { directConnection: true, serverSelectionTimeoutMS: 1500 });
    try { await client.db("admin").command({ shutdown: 1, force: true, timeoutSecs: 1 }); }
    catch { /* Shutdown closes the connection before replying. */ }
    finally { await client.close(); }
    for (let i = 0; i < 100 && proc.exitCode === null; i++) await pause(100);
    if (proc.exitCode === null) proc.kill();
    await ended;
  }
  try { await launch(db); }
  catch (error) { await stop(); await rm(root, { recursive: true, force: true }); throw error; }
  return { root, uri, async restoreCopy() {
    await stop();
    const restored = path.join(root, "restored");
    await cp(db, restored, { recursive: true });
    await launch(restored);
  }, async close() { await stop(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }); } };
}
