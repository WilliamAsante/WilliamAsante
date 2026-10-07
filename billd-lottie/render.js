/* Render the BILLD logo sting (Lottie reveal + tagline) to MP4 with a sound hit,
   and the loader to a GIF. Needs Node, Playwright, ffmpeg and a local server
   at the repository root:  python3 -m http.server 8766
   Run:  node billd-lottie/render.js */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const ROOT = __dirname, FPS = 30;
const BASE = "http://localhost:8766/billd-lottie/index.html";
const TRACK = path.resolve(ROOT, "..", "billd-motion", "audio", "billd-track.wav");

async function sting(size) {
  const [w, h] = size.split("x").map(Number);
  const dir = fs.mkdtempSync(path.join(process.env.BILLD_TMP || os.tmpdir(), "sting-"));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASE}?render=1&size=${size}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const n = Math.round((await p.evaluate(() => window.__duration)) * FPS);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.__seek(t), i / FPS);
    await p.screenshot({ path: path.join(dir, `${String(i).padStart(4, "0")}.png`) });
  }
  await b.close();
  const out = path.join(ROOT, "out", `billd-logo-sting-${size}.mp4`);
  // Sound: the drop from the ad's soundtrack, lined up so the hit lands with the letters.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"),
    "-ss", "9.65", "-t", String(n / FPS), "-i", TRACK, "-af", `afade=t=out:st=${n / FPS - 0.8}:d=0.8`,
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("wrote", path.relative(process.cwd(), out));
}

async function loaderGif() {
  const dir = fs.mkdtempSync(path.join(process.env.BILLD_TMP || os.tmpdir(), "loader-"));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 240, height: 240 } });
  await p.goto(BASE); // loads the Lottie player
  await p.evaluate(() => new Promise((res) => {
    document.body.innerHTML = '<div id="a" style="width:240px;height:240px"></div>';
    document.body.style.background = "#170D0A";
    window.anim = lottie.loadAnimation({ container: document.getElementById("a"), renderer: "svg", loop: true, autoplay: false, path: "billd-loader.json" });
    if (anim.isLoaded) res();
    else anim.addEventListener("DOMLoaded", res);
  }));
  for (let i = 0; i < 30; i++) {
    await p.evaluate((f) => anim.goToAndStop(f, true), i * 2);
    await p.screenshot({ path: path.join(dir, `${String(i).padStart(3, "0")}.png`) });
  }
  await b.close();
  const out = path.join(ROOT, "out", "billd-loader.gif");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(dir, "%03d.png"),
    "-vf", "split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse", "-loop", "0", out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("wrote", path.relative(process.cwd(), out));
}

(async () => {
  const only = process.argv[2];
  if (!only || only === "sting") for (const s of ["1080x1080", "1080x1920", "1920x1080"]) await sting(s);
  if (!only || only === "loader") await loaderGif();
})();
