import fileUpload from "express-fileupload";
import os from "node:os";
import { rm } from "node:fs/promises";
export const receiveLecture = fileUpload({ useTempFiles: true, tempFileDir: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 }, abortOnLimit: true });
export function cleanupUpload(req, res, next) {
  res.once("close", () => {
    for (const file of Object.values(req.files || {}).flat()) {
      if (file.tempFilePath) rm(file.tempFilePath, { force: true }).catch(() => console.warn("upload_cleanup_failed"));
    }
  });
  next();
}
