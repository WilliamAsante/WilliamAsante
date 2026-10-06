# Sunday Oven Bakery website

A one-page website for a neighborhood bakery. It's plain HTML, CSS and JavaScript, so there's nothing to install or build. Photos load from the Unsplash CDN.

What's on the page, top to bottom:

- **Announcement bar** with a close button. Visitors who close it won't see it again until you change its text.
- **Hero**: a full-width photo with the headline and two buttons.
- **Today's bake board**: lists when each batch comes out of the oven and marks items as *In the oven*, *Just out* or *Ready*, based on the time of day and your opening hours.
- **Two promo banners**: coffee, and celebration cakes.
- **Top sellers**: eight products with photos and prices.
- **What we bake**: six category tiles that jump to that part of the menu.
- **Why it tastes different**: six short points arranged around a round photo.
- **About us**, with a photo that overlaps the menu.
- **Menu**: tabs for bread, pastry, cakes, treats and drinks. The photo changes with the tab.
- **Reviews**: a featured quote and three review cards. These are placeholders, so replace them with real reviews.
- **Cakes and big orders**: a form that checks the fields, needs 2 days' notice and blocks days you're closed. It then opens the visitor's email app with the order filled in.
- **Visit us**: opening hours with today highlighted, address, phone, map and directions.
- **Newsletter sign-up** and a **footer** with contact details and links.

## Preview it

Open `index.html` in a browser, or run a local server:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Make it yours

Everything uses placeholder content. Search and replace these:

| What | Where |
| --- | --- |
| Bakery name "Sunday Oven" | `index.html` (title, header, hero, about, footer) |
| Address, phone, email | `index.html`, in the **Visit** section, header and footer |
| Map and directions | `index.html`: the `q=` in the map `<iframe>` and the `#directions` link |
| Announcement text | `index.html`, the `.announce` bar at the top |
| Menu items and prices | `index.html`, in the **Menu** section. Copy an `<li class="item">` block to add an item |
| Top sellers | `index.html`, the `<li class="product">` items. Keep prices in step with the menu |
| Reviews | `index.html`, the **Reviews** section. Use real reviews, with permission |
| Bake schedule | `index.html`, the `<li class="bake" data-time="HH:MM">` items. `data-time` uses 24-hour time |
| Opening hours | `index.html`, the `<tr data-day="…" data-open="HH:MM" data-close="HH:MM">` rows. Leave out `data-open`/`data-close` for days you're closed |
| Order email, sign-up email, notice period, time zone | Settings at the top of `js/main.js` |
| Colors and fonts | Tokens at the top of `css/styles.css` |

Set `TIMEZONE` in `js/main.js` (for example `"America/New_York"`) so the open/closed status is correct for visitors in other time zones.

## Photos

All photos come from the [Unsplash](https://unsplash.com) CDN and are free to use under the [Unsplash License](https://unsplash.com/license). Each URL looks like this:

```
https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&h=600&q=75
```

`w` and `h` set the size it's cropped to. To swap a photo, find one you like on unsplash.com, copy its image address, and replace the `photo-…` part. To use your own photos, put them in an `images/` folder and set `src="images/your-photo.jpg"`. Real photos of your bakes will always beat stock ones.

If a photo fails to load, the site hides it and shows a plain pink panel instead of a broken-image icon.

| Photo ID | Used for |
| --- | --- |
| `photo-1509440159596-0249088772ff` | Hero background, Bread tile |
| `photo-1555507036-ab1f4038808a` | Butter croissant, Pastry menu tab |
| `photo-1586871309760-4cceac05ea12` | Country sourdough, Bread menu tab |
| `photo-1578985545062-69928b1d9587` | Chocolate fudge cake, Cakes menu tab |
| `photo-1499636136210-6f4ee915583e` | Brown butter cookie, Treats menu tab |
| `photo-1509042239860-f550ce710b93` | Flat white, Drinks menu tab |
| `photo-1464349095431-e9a21285b5f3` | Summer berry cake |
| `photo-1568678898762-47a72e9614b6` | Iced sugar cookies |
| `photo-1520512202623-51c5c53957df` | Doughnut of the day |
| `photo-1461988366670-48e401bafb0a` | Coffee banner |
| `photo-1587159912251-f16fcd155184` | Celebration cakes banner |
| `photo-1744439890614-2800f2b0871c` | Pastry tile |
| `photo-1550105666-4d0b04475f31` | Cakes tile |
| `photo-1581319026032-b1313cce7918` | Cookies & treats tile |
| `photo-1569851379911-88fd7a408731` | Coffee & drinks tile |
| `photo-1744638628542-12578d73179b` | Pastry boxes tile |
| `photo-1421435371524-d26441ec7dda` | "Why it tastes different" photo |
| `photo-1464979681340-bdd28a61699e` | About us |
| `photo-1565853457079-562afb49d09f` | Cake orders |
| `photo-1745827213105-59dfd024ad2a` | Opening hours |

## Connecting the forms

Without a server, the order form and the newsletter sign-up open the visitor's email app with everything filled in. To receive submissions directly instead, sign up for a form service such as [Formspree](https://formspree.io) or [Netlify Forms](https://docs.netlify.com/forms/setup/), point the form at it, and remove that form's `submit` handler in `js/main.js`.

## Publish it with GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch and the `/ (root)` folder, and save.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within a few minutes.

## Files

```
index.html        Page content
css/styles.css    All styles
js/main.js        Open/closed status, bake board, menu tabs, forms, announcement bar
assets/favicon.svg
```
