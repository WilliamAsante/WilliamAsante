# Sunday Oven Bakery website

A one-page website for a neighborhood bakery. It's plain HTML, CSS and JavaScript, so there's nothing to install or build.

What's on the page:

- **Today's bake board**: lists when each batch comes out of the oven and marks items as *In the oven*, *Just out* or *Ready*, based on the time of day and your opening hours.
- **Menu**: prices, descriptions and tags (vegan, contains nuts), with buttons to show one section at a time.
- **About**: a short story section.
- **Cake and big-order form**: checks the fields, needs 2 days' notice, blocks days you're closed, then opens the visitor's email app with the order filled in.
- **Visit**: address, contact details and opening hours. Today's row is highlighted.

## Preview it

Open `index.html` in a browser, or run a local server:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Make it yours

Everything below uses placeholder content. Search and replace these:

| What | Where |
| --- | --- |
| Bakery name "Sunday Oven" | `index.html` (title, header, about, footer) |
| Address, phone, email | `index.html`, in the **Visit** section and footer |
| Map link | `href` of the `#directions` link in `index.html` |
| Menu items and prices | `index.html`, in the **Menu** section. Copy an `<li class="item">` block to add an item |
| Bake schedule | `index.html`, the `<li class="bake" data-time="HH:MM">` items. `data-time` uses 24-hour time |
| Opening hours | `index.html`, the `<tr data-day="…" data-open="HH:MM" data-close="HH:MM">` rows. Leave out `data-open`/`data-close` for days you're closed |
| Order email, notice period, time zone | Settings at the top of `js/main.js` |
| Colors and fonts | Tokens at the top of `css/styles.css` |

Set `TIMEZONE` in `js/main.js` (for example `"America/New_York"`) so the open/closed status is correct for visitors in other time zones.

### Adding photos

Put images in an `images/` folder. To replace the bread illustration in the About section, swap the `<svg>` inside `<figure class="about-art">` for:

```html
<img src="images/shopfront.jpg" alt="Our counter with the morning's loaves">
```

### Connecting the order form

Without a server, the form opens the visitor's email app with the order written out. To receive orders directly instead, sign up for a form service such as [Formspree](https://formspree.io) or [Netlify Forms](https://docs.netlify.com/forms/setup/), then point the form at it and remove the `submit` handler in `js/main.js`.

## Publish it with GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick your main branch and the `/ (root)` folder, and save.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within a few minutes.

## Files

```
index.html        Page content
css/styles.css    All styles
js/main.js        Open/closed status, bake board, menu filter, order form
assets/favicon.svg
```
