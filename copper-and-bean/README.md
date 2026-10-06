# Copper & Bean: website front-end

The new front-end for Copper & Bean, a small-batch coffee roastery and cafe. Every page and customer flow is built and clickable. Payments and accounts are **simulated in the browser** until a backend is connected (see [Connecting a backend](#connecting-a-backend)).

Plain HTML, CSS and JavaScript. No build step.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: hero, bestsellers, an interactive **roast curve** that draws as you scroll through the roasting process, origins, subscription pitch, upcoming workshops, reviews, cafe hours and gallery |
| `shop.html` | All products with category, roast and sort filters. Each product opens a detail view with size, grind and quantity. Link to one with `shop.html?product=ethiopia-guji` |
| `subscribe.html` | **Roaster's Choice** plan builder (grind, coffee style, bags, frequency) with live pricing, plus FAQ |
| `workshops.html` | Workshop types, a **booking calendar** with available days, time slots, seats left and ticket quantity. Link to a session with `workshops.html?session=…` |
| `checkout.html` | One checkout for coffee, gear, subscriptions and workshop tickets. Delivery or pickup, shipping costs, free shipping over $50, card form, confirmation with "Add to calendar" for workshops |
| `account.html` | **Customer portal**: skip a delivery, pause for 1 to 3 months, resume, change plan, update address, cancel or restart. Also lists upcoming workshop bookings (cancel up to 48 hours before) and past orders. Use **Open a demo account** to show it with sample data |

Shared across pages: announcement bar, header with cart count, full-screen mobile menu, slide-out cart with a free-shipping progress bar, newsletter sign-up, and a footer with the roastery's live local time and whether the cafe is open.

## Preview it

Run any local web server from the repository root, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/copper-and-bean/
```

## Editing content

Almost everything lives in **`js/data.js`**:

- **Products**: name, prices per size, roast, origin, tasting notes, description, badge, and which ones show as bestsellers (`featured: true`)
- **Workshops**: name, description, price, capacity, days of the week and start time
- **Opening hours**, **contact details**, **shipping prices**, the **free-shipping threshold**, the **subscription price per bag**, and the **time zone** used by the footer clock
- **Photos**: the `CB.photos` list maps names to Unsplash photo IDs

Colors and fonts are tokens at the top of `css/styles.css`.

### Photos

Atmosphere photos come from the [Unsplash](https://unsplash.com) CDN as placeholders. **They should be replaced with Copper & Bean's own photography,** especially of the roaster, the bar and the workshops. To swap one, change its ID in `CB.photos`, or point an `<img>` at a local file. If a photo fails to load, its frame shows a dark copper gradient instead of a broken image.

Product images are illustrations drawn in code (`CB.art` in `js/app.js`), so the grid stays consistent. Swap them for product photos by replacing the `CB.art(...)` calls in `CB.productCard` and the product dialog.

### Placeholder content

- The address, phone number, email and Instagram handle
- Reviews on the home page (marked "Customer name"). Replace them with real ones, with permission
- Roast times and temperatures in the roasting section. Ask the head roaster for a real profile; the curve points are in `js/home.js`
- Workshop seats already sold are **simulated** from the date

## Connecting a backend

Every place that needs a server is marked in the code. Recommended setup: **Stripe**, with a few serverless functions on Netlify or Vercel.

| Feature | Front-end today | Connect to |
| --- | --- | --- |
| Cart | `localStorage` (`CB.store` in `js/app.js`) | Can stay client-side |
| Checkout and payment | Simulated in `js/checkout.js` (`placeOrder`) | Stripe Checkout or the Payment Element. Create the session in a serverless function and redirect |
| Roaster's Choice | Saved in the browser on checkout | Stripe Billing subscriptions. Skip uses `pause_collection` or a billing-cycle change, pause uses `pause_collection`, and plan changes swap the price |
| Customer portal | `js/account.js` | Call the same Stripe APIs from serverless functions, or link to Stripe's hosted Customer Portal |
| Workshop seats | Simulated in `CB.sessions` | A small database or Airtable table of sessions with capacity. Decrement on the Stripe `checkout.session.completed` webhook |
| Sign-in | Instant, no email sent | Magic-link email, for example Stripe Link, Supabase Auth or Clerk |
| Newsletter | Shows a thank-you message only | Klaviyo, Mailchimp or Buttondown |

Shopify is the alternative if the team would rather manage products and orders in a dashboard. This design can become a Shopify theme, with subscription and booking apps.

## Files

```
index.html, shop.html, subscribe.html, workshops.html, checkout.html, account.html
css/styles.css     All styles
js/data.js         Products, workshops, hours, contact, settings
js/app.js          Shared: cart, header/footer, cart drawer, product dialog, illustrations, sessions
js/home.js         Home page (roast curve, origins, upcoming workshops)
js/shop.js, js/subscribe.js, js/workshops.js, js/checkout.js, js/account.js
assets/favicon.svg
```

Smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) from a CDN. The site works without it, and it's turned off for visitors who prefer reduced motion.
