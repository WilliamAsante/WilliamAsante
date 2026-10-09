# Website replicas

Two single-file sites (images are embedded in each `index.html`).

- `edifis-royal/index.html` is a five-page construction firm site (Home, Services, Projects, Portfolio, Contact).
- `hartwell-juristic/index.html` is a six-page law firm site (Home, About, Practice Areas, Attorney Team, Insights, Contact) with GSAP, ScrollTrigger and Lenis animations loaded from a CDN, so it needs an internet connection for motion and fonts.

Pages switch with the URL hash, for example `index.html#contact`.

## Run locally

From this folder:

    python3 -m http.server 5500

Then open http://localhost:5500/edifis-royal/ or http://localhost:5500/hartwell-juristic/ and use your browser's Inspect tool.
