import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
import { getSteamCMD } from "./utils";
import { spawn } from "child_process";
import { resolve } from "path";

console.log(`Welcome`);

main();

async function main() {
  const steamcmd = await getSteamCMD();

  console.log(`SteamCMD path: ${steamcmd}`);

  let appid: string;
  let loginData: string;
  let files: string[] = [];

  if (existsSync(resolve(__dirname, "../config.json"))) {
    const config = require("../config.json");
    loginData = config.loginData;
  }

  console.log(`Now enter the appid of the game`);
  process.stdin.on("data", (data) => {
    const text = data.toString().trim();
    if (!appid) {
      appid = text.toString().trim();
      console.log(`AppID: ${appid}`);
      if (loginData) {
        console.log(
          `Now enter the files to download. Either an appid or a link to the file`
        );
      } else {
        console.log(
          `Now enter the login in this format: {login} {password}.\nYou can enter \`anonymous\`, but it may not work on all games\nIf you have a steam guard, then you need to login in SteamCMD firstly (go to the path and do \`login {login} {password}\`)`
        );
      }
      return;
    }
    if (!loginData) {
      loginData = text;
      console.log(
        `Login data: ${loginData}. I will store it in config.json so you don't need to reenter it`
      );
      const login = { loginData };
      writeFileSync("config.json", JSON.stringify(login));
      console.log(
        `Now enter the files to download. Either an appid or a link to the file`
      );
      return;
    }
    if (text === "done") {
      console.log(`Creating script...`);
      let script = `@ShutdownOnFailedCommand 0
@NoPromptForPassword 1
force_install_dir ${resolve(__dirname, "../cache")}
login ${loginData}`;
      files.forEach((file) => {
        script += `\nworkshop_download_item ${appid} ${file} validate`;
      });
      try {
        mkdirSync("cache");
      } catch (err) {}
      script += `\nquit`;
      writeFileSync("cache/script.txt", script);
      console.log(`Script created. Starting download...`);

      process.stdin.removeAllListeners("data");
      const child = spawn(`${steamcmd}`, [
        "+runscript",
        resolve(__dirname, "../cache/script.txt"),
      ]);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (data) => {
        if (data.toString().includes("Invalid Password")) {
          console.clear();
          console.log(`You provided wrong password.`);
          rmSync("config.json");
          process.exit();
        }
        if (data.toString().includes("Account Logon Denied")) {
          console.clear();
          console.log(
            `You forgot to enter steam guard before running this program.`
          );
          rmSync("config.json");
          process.exit();
        }
        console.log(data.toString());
      });
      process.stdin.on("data", (data) => {
        child.stdin.write(data);
      });
      child.on("close", () => {
        console.clear();
        console.log(`Download finished, putting files in mods folder`);
        try {
          mkdirSync("mods");
        } catch (err) {}
        for (const file of readdirSync(
          `cache/steamapps/workshop/content/${appid}`
        )) {
          renameSync(
            resolve(`cache/steamapps/workshop/content/${appid}/`, file),
            `mods/${file}`
          );
        }
        rmSync("cache", { recursive: true, force: true });
        console.log(`Done!`);
        process.exit();
      });
      return;
    }

    if (text.startsWith("http")) {
      files.push(
        text.slice(
          text.indexOf("id=") + 3,
          text.indexOf("&") > 0 ? text.indexOf("&") : text.length
        )
      );
    } else {
      files.push(text);
    }
    console.log(`Added to list. Say \`done\` to start downloading.`);
  });
}
