/* Render the BILLD 3D ad to MP4, frame by frame, with the soundtrack.

   Needs Node, Playwright (Chromium) and ffmpeg, plus a local web server
   serving the repository root, for example:
     python3 -m http.server 8766          (from the repository root)
     node billd-3d/render/render.js 9x16
     node billd-3d/render/render.js all

   Output: billd-3d/out/billd-3d-ad-<format>.mp4 (soundtrack from billd-motion/audio) */

const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 30;
const BASE = process.env.BILLD_URL || "http://localhost:8766/billd-3d/index.html";
const SIZES = { "9x16": [1080, 1920], "4x5": [1080, 1350], "16x9": [1920, 1080] };
const ROOT = path.resolve(__dirname, "..");
const AUDIO = path.resolve(ROOT, "..", "billd-motion", "audio", "billd-track.wav");

async function render(fmt) {
  const [w, h] = SIZES[fmt];
  const frames = fs.mkdtempSync(path.join(process.env.BILLD_TMP || os.tmpdir(), `billd3d-${fmt}-`));
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}?f=${fmt}&render=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  const duration = await page.evaluate(() => window.__duration);
  const total = Math.round(duration * FPS);
  const started = Date.now();

  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__seek(t), i / FPS);
    await page.screenshot({
      path: path.join(frames, `${String(i).padStart(5, "0")}.jpg`),
      type: "jpeg",
      quality: 92,
      clip: { x: 0, y: 0, width: w, height: h },
    });
    if (i % 150 === 0) process.stdout.write(`${fmt}: frame ${i}/${total}\n`);
  }
  await browser.close();
  if (errors.length) console.warn(`${fmt}: page errors`, errors);

  const out = path.join(ROOT, "out", `billd-3d-ad-${fmt}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", path.join(frames, "%05d.jpg"),
    "-i", AUDIO,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart",
    out,
  ]);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log(`${fmt}: wrote ${path.relative(process.cwd(), out)} in ${Math.round((Date.now() - started) / 1000)}s`);
}

(async () => {
  const arg = process.argv[2] || "9x16";
  const list = arg === "all" ? Object.keys(SIZES) : [arg];
  for (const fmt of list) {
    if (!SIZES[fmt]) throw new Error(`Unknown format ${fmt}. Use 9x16, 4x5, 16x9 or all.`);
    await render(fmt);
  }
})();
