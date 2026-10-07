# BILLD 3D motion ad

The 3D-and-illustration version of the BILLD ad. Real 3D objects in BILLD's colours are drawn like an illustration, with flat cel shading and ink outlines. A floating cartoon-glove cursor builds, taps and points its way through the story, with the same kinetic type and soundtrack as the original ad (`../billd-motion`).

Rendered videos are in `out/` (56 seconds, with music):

| File | Size | Use |
| --- | --- | --- |
| `billd-3d-ad-9x16.mp4` | 1080×1920 | Instagram Reels, TikTok, Stories |
| `billd-3d-ad-4x5.mp4` | 1080×1350 | Instagram and LinkedIn feed |
| `billd-3d-ad-16x9.mp4` | 1920×1080 | YouTube, website, pitch meetings |

## Story (120 BPM, one beat = 0.5 s)

| Time | Scene |
| --- | --- |
| 0–4 s | "Your website is losing you money." An old browser coughs up coins as MONEY falls apart |
| 4–10 s | SLOW (a loader that never finishes), OUTDATED (the creaky 2005 homepage), INVISIBLE ON PHONES. The glove pinches, taps, gives up and pokes the phone to pieces |
| 10–14 s | The pieces pull together and the 3D BILLD logo drops in. The glove taps the tall bar and it springs |
| 14–26 s | FAST (stopwatch), AFFORDABLE (swinging price tag and coins), QUALITY (cut gem), RESULTS (rising bars and arrow) |
| 26–34 s | Design → Build → Launch: the glove places blocks on a laptop, they turn into a website, it clicks *Book now* and confetti flies |
| 34–42 s | Recent work: the glove scrolls Sunday Oven Bakery, then taps Copper & Bean on a phone |
| 42–47 s | "We build for": 19 industries, each with its own 3D icon |
| 47 s | "YOU." The glove points at the viewer |
| 48–56 s | "Let's build yours." 3D logo, tagline, and the glove taps 055 724 4074 |

## How it's built

- `js/kit.js`: the look. Toon materials (three flat tones), ink outlines, drawn contact shadows, the 3D logo and the glove.
- `js/props.js`: every object (old browser, phone, laptop, stopwatch, price tag, gem, chart, industry icons), built from simple shapes.
- `js/ad3d.js`: the film. One GSAP timeline plus a per-frame `update(t)`, one block per scene, times in seconds.
- Libraries: [Three.js](https://threejs.org) r186 (MIT) and GSAP, both in `vendor/`. Fonts, logo, screenshots and music are shared from `../billd-motion`.

## Preview, edit and render

1. Serve the repository root: `python3 -m http.server 8766`
2. Preview with music: `http://localhost:8766/billd-3d/`. Use the format menu to switch sizes.
3. Render: `node billd-3d/render/render.js all`, or pass `9x16`, `4x5` or `16x9`. It needs Node, Playwright and ffmpeg, and takes about 10 minutes per format with software rendering.

The Copper & Bean screenshots show a real client's brand. Check with the client before running the ad publicly.
