import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.text({ type: "*/*" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/deobf", async (req, res) => {
  let code = req.body;
  try {
    let payload = { filename: "input.lua", source: code, lua_version: "Lua51", pretty: true };
    let response = await fetch("https://relua.lua.cz/deobfuscate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = await response.json();

    if (!data.ok) {
      payload.lua_version = "LuaU";
      response = await fetch("https://relua.lua.cz/deobfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      data = await response.json();
      if (!data.ok) throw new Error(data.error || "Deobfuscation failed");
    }

    let formatted = "--[[ 45ms deobf written in lua ]]\n\t" + data.output.replace(/\r?\n/g, "\n\t");

    let renameRes = await fetch("https://renamer-rd14.onrender.com/api", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: formatted
    });
    let renamedCode = await renameRes.text();

    res.send(renamedCode);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// =====================
// Auto ping renamer API
// =====================
async function pingRenamer() {
  try {
    await fetch("https://renamer-rd14.onrender.com/api", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "keep-alive ping"
    });
    console.log("Renamer API pinged successfully");
  } catch (err) {
    console.log("Renamer API ping failed:", err.message);
  }
}

// Ping every 60 seconds
setInterval(pingRenamer, 60 * 1000);

// Optional: ping immediately on startup
pingRenamer();
