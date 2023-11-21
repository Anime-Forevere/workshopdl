import download from "download";
import { createReadStream, existsSync, mkdirSync } from "fs";
import unzip from "unzip";
import { exec } from "child_process";
import path from "path";

export const getSteamCMD = async () => {
  switch (process.platform) {
    case "win32":
      if (!existsSync("steamcmd/steamcmd.exe")) {
        await downloadSteamCMD();
      }
      return path.resolve(__dirname, "../steamcmd/steamcmd.exe");
    case "linux":
    case "darwin":
      for (const p of process.env?.PATH?.split(":") ?? []) {
        if (existsSync(`${p}/steamcmd`)) {
          return `${p}/steamcmd`;
        }
      }
      throw new Error(
        "SteamCMD not found in PATH. Install it using the official documentation.\nhttps://developer.valvesoftware.com/wiki/SteamCMD"
      );
    default:
      throw new Error("Unsupported platform");
  }
};

export const downloadSteamCMD = async () => {
  console.log("Downloading SteamCMD...");

  mkdirSync(`steamcmd`, { recursive: true });
  await download(
    `https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip`,
    "steamcmd"
  );

  createReadStream("steamcmd/steamcmd.zip").pipe(
    unzip.Extract({ path: "steamcmd" })
  );

  console.log("Downloaded SteamCMD.");
};
