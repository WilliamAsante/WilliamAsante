# Calder Ridge Resources — homepage

A single-file homepage (`index.html`): HTML, CSS and vanilla JS, no build step. Open it in a browser.

## Adding your photos

Every photo slot is a `div` with the class `im` and a `data-alt` description. To fill one, add `data-src`:

```html
<div class="im rv" data-alt="Ore train crossing the Pilbara below Mount Ferrell"></div>
<!-- becomes -->
<div class="im rv" data-src="photos/ferrell-train.jpg" data-alt="Ore train crossing the Pilbara below Mount Ferrell"></div>
```

The slot keeps its aspect ratio and crops the photo to fit (`object-fit: cover`). `data-alt` becomes the image's alt text, so keep it accurate. There are 19 slots:

| Where | Slots | Shape |
|---|---|---|
| Lease cards (Mount Ferrell, Ridgeback, Karri Creek) | 3 | 4:3 |
| Ridgeback in depth (core from RB-052) | 1 | 4:5 portrait |
| Site life, 05:00 to 22:00 | 6 | 3:2 |
| Field notes FN-040, 036, 031, 024 | 4 | 4:3 |
| Closure, north waste dump, years 0, 3 and 8 | 3 | 4:3, same survey mark |
| News lead (Karri Creek solar farm) | 1 | 16:9 |
| Footer artwork band (Ngadju commission) | 1 | 7:1 |

The closure photos only work if they are taken from the same point each year. The fourth frame (Year 10, 2028) is deliberately empty.

## The system

**Grid.** 12 columns, 24px gutters, 58px side margins at desktop. Columns 1–2 are the rail and hold section numbers and figure captions. Content starts at column 3. The header cells, hero title block and footer title block sit on the same column lines.

**Colour** (CSS variables at the top of the file)

| Token | Use |
|---|---|
| `--bone` `#ece6dc` | Page ground |
| `--ink` `#0d1440` | Text, rules, the Site life band and footer |
| `--fe` `#9b2f1f` | Mount Ferrell, iron ore |
| `--au` `#a8771a` | Ridgeback, gold |
| `--sp` `#7f9a8c` | Karri Creek, lithium |
| `--gr` `#2f4239` | Closure band, a darker shade of the lithium sage |
| `--hv` `#f6c40c` | Hi-vis yellow, used only for safety (TRIFR) and the community line |

**Type**

| Role | Face | Sizes |
|---|---|---|
| Title, section heads, big figures | Archivo, extended width (118), bold | 150 / 64 / figures 30–116 |
| Text, sub-heads, tables | Instrument Sans | 28 / 26 / 19 / 17 / 14 |
| IDs, coordinates, ticker, chart scales | JetBrains Mono | 13 / 11 |

**Motion.** Images wipe in on scroll. The map coastline draws in. The Ridgeback long section has a depth gauge that follows the middle of the screen. Site life connects each card to its hour on a 24-hour axis, with sunrise and sunset shaded. The closure timeline draws from Year 0 to today. Field notes open in a lightbox. All motion is switched off for visitors who set reduced motion.

## Content to check before launch

Everything is placeholder. That includes the company, figures, share price, phone numbers, ABN, dates, coordinates and news. Replace it with real data. The Traditional Owner groups named (Banjima, Ngadju, Noongar) are real peoples. Confirm the wording of the acknowledgement and any reference to them with the groups themselves.
