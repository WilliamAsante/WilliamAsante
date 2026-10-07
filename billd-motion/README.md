# BILLD motion ad

A 56-second kinetic-type ad for **BILLD**, Bill's web design studio. *Fast. Affordable. Built to sell.*

Rendered videos are in `out/`:

| File | Size | Use |
| --- | --- | --- |
| `billd-ad-9x16.mp4` | 1080×1920 | Instagram Reels, TikTok, Stories |
| `billd-ad-4x5.mp4` | 1080×1350 | Instagram and LinkedIn feed |
| `billd-ad-16x9.mp4` | 1920×1080 | YouTube, website, pitch meetings |

## Story (120 BPM, one beat = 0.5 s)

| Time | Scene |
| --- | --- |
| 0–4 s | Hook: "Your website is losing you money." One word per beat, then the money falls out |
| 4–10 s | Problem: SLOW (loading bar), OUTDATED (a 2005 homepage that glitches), INVISIBLE ON PHONES |
| 10–14 s | Reveal: orange and white flood the screen, the BILLD logo builds itself |
| 14–26 s | Four promises: Fast, Affordable, Quality, Results |
| 26–34 s | Process: a browser builds a website, Design → Build → Launch, then goes live |
| 34–42 s | Recent work: Sunday Oven Bakery and Copper & Bean |
| 42–47 s | "We build for": all 19 industries, one per half beat |
| 47 s | "YOU." |
| 48–56 s | "Let's build yours." Logo, tagline, WhatsApp or call 055 724 4074 |

## Brand

- **Logo:** two colours only, on dark backgrounds. `logo/billd-logo.svg` is white letters with orange LL bars (used in the videos); `logo/billd-logo-alt.svg` is the reverse (orange letters, white LL). The `-on-dark` files include the dark background. The double L is two rising bars, like a results chart.
- **Colors:** red `#E8261C`, orange `#FF7A1A`, white `#FFFFFF`, ink `#170D0A`.
- **Type:** Archivo (variable width and weight) and DM Mono, both open-source and stored in `fonts/`.

## Music

`audio/billd-track.wav` is an original track generated in code by `audio/generate.py` (Python with numpy and scipy), so there's nothing to license. Every hit is timed to the animation. To use a licensed track instead, keep it at 120 BPM and replace the WAV file, then re-render.

## Edit and re-render

- **Preview:** serve the repository root (`python3 -m http.server 8766`), then open `http://localhost:8766/billd-motion/`. It plays with music, has a scrub bar and switches formats.
- **Change words, colors or timing:** everything is in `js/ad.js`, one section per scene, with times in seconds.
- **Render:** `node billd-motion/render/render.js all`, or pass `9x16`, `4x5` or `16x9`. Needs Node, Playwright and ffmpeg. It takes about 2 minutes per format.

The Copper & Bean screenshots in `assets/` show a real client's brand. Check with the client before running the ad publicly.

GSAP (`vendor/gsap.min.js`) is used under its free standard license.
