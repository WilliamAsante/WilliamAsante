# BILLD Lottie kit

Lightweight, scalable BILLD animations built from the logo's own vector paths.
Colours: white letters and `#E9261D` bars on a transparent background, made for dark backgrounds.

| File | What it is |
| --- | --- |
| `billd-logo-reveal.json` | Logo reveal: B, I and D drop in with a bounce, then the two L bars spring up. 2.5 s, plays once. |
| `billd-loader.json` | Loading animation: the two L bars pulse in turn. 1 s, loops. |
| `out/billd-logo-sting-1080x1080.mp4` | Logo reveal + tagline with a sound hit, 3.5 s, square feed post. |
| `out/billd-logo-sting-1080x1920.mp4` | Same, vertical for Reels, TikTok and Status. |
| `out/billd-logo-sting-1920x1080.mp4` | Same, widescreen for YouTube and pitch decks. |
| `out/billd-loader.gif` | The loader as a GIF, for places that don't play Lottie. |

Open `index.html` through a local server to preview both animations.

## Use on a website

```html
<div id="billd-logo" style="width:320px"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.13.0/lottie.min.js"></script>
<script>
  lottie.loadAnimation({
    container: document.getElementById("billd-logo"),
    renderer: "svg",
    loop: false,          // true for billd-loader.json
    autoplay: true,
    path: "billd-logo-reveal.json",
  });
</script>
```

The JSON files also open in LottieFiles (upload, preview, edit colours, export as GIF/MP4/dotLottie) and play in Webflow, Framer, WordPress (LottieFiles plugin), iOS and Android.

## Rebuild

```bash
python3 billd-lottie/build.py          # regenerate the two JSON files
python3 -m http.server 8766            # from the repo root
node billd-lottie/render.js sting      # the three MP4 stings
node billd-lottie/render.js loader     # the GIF
```

Rendering needs Playwright (Chromium) and ffmpeg. The sting's sound is cut from `billd-motion/audio/billd-track.wav`.

`vendor/lottie.min.js` is lottie-web 5.13.0 (MIT, see `vendor/LOTTIE-LICENSE.md`).
