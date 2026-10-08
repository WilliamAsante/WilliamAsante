# Presbyterian Church of Ghana, Mpraeso: landing page

A one-page site for the Mpraeso congregation: plain HTML, CSS and JavaScript, no build step.
Open `index.html` through any web server (for example `python3 -m http.server` from the repo root).

## Sections

1. **Top bar and header**: next service, sticky menu, slide-in menu on phones.
2. **Hero**: "Akwaaba" welcome, plus a live countdown to the next service.
3. **Service times**: Sunday services, morning devotion, Bible study, prayer and revival.
4. **About**: a word from the Minister and the church's three pillars.
5. **Heritage**: the burning bush, *Nec tamen consumebatur* (Exodus 3:2), and the Basel Mission roots.
6. **Ministries**: the nine generational groups (Children's Service, JY, YPG, YAF, Women's and Men's Fellowship, Choir, Singing Band, BSPG).
7. **Sermons**: the latest sermon, recent messages and links to the live streams.
8. **Events**: filterable calendar with *Add to calendar* (.ics) buttons. Past events hide themselves.
9. **Give**: tabs for Mobile Money, Bank and giving at church.
10. **Plan a visit**: map, contact details, FAQ, and a visit or prayer form that sends through WhatsApp.
11. **Footer**

Motion: the hero photo drifts slowly, sections rise in as you scroll, the flame in the logo flickers, and the big photos have a light parallax. If a visitor's device has *reduce motion* turned on, they get simple fades instead.

## Before launch: details to confirm with the church

Everything below is a sensible placeholder. Edit the text in `index.html` and the settings at the top of `js/main.js`.

- [ ] Service times (`index.html` *Service times* section, plus `SERVICES` in `js/main.js` for the countdown)
- [ ] Generational group meeting days, times and age ranges
- [ ] The Minister's name (currently "The Resident Minister") and their welcome message
- [ ] Church office phone number and office hours
- [ ] WhatsApp number for the form (`CONFIG.whatsapp` in `js/main.js`, digits only, e.g. `233241234567`)
- [ ] MoMo account name and number, and bank details (*Give* section)
- [ ] YouTube, Facebook and WhatsApp channel links (`CONFIG.links` in `js/main.js`)
- [ ] Sermon titles. The current ones are samples.
- [ ] Event dates and descriptions (`EVENTS` in `js/main.js`)
- [ ] Map pin: check that it lands on the church, or swap in the embed link from Google Maps > Share > Embed

## Photos

The page currently uses free Unsplash photos of misty hills, a sanctuary, a Bible and a candle. They set the mood but don't show the congregation. **The church's own photos will always beat stock**: real members, the real building, the Kwahu hills from the church grounds.

To replace a photo, save a JPG into `assets/photos/` with the matching name. The page switches to it automatically; there's no code to change.

| File name | Where it shows | Shape | Good choice |
| --- | --- | --- | --- |
| `hero.jpg` | Full-screen welcome | Wide, 2000 px+ | The church building at sunrise, or the congregation in worship |
| `about-1.jpg` | Minister's welcome, large | Landscape | The sanctuary, or the Minister with members |
| `about-2.jpg` | Minister's welcome, small | Portrait | A Bible, hands in prayer, or children in Sunday school |
| `heritage.jpg` | Burning-bush band (shown faint) | Wide | Kwahu hills, mist, or the church at dusk |
| `sermon.jpg` | Latest sermon thumbnail | 16:9 | The preacher at the pulpit |

### Envato Elements options (download with your subscription)

If the church has no photos yet, these Envato Elements photos fit the slots:

- **hero**: [Congregation clapping along to gospel music](https://elements.envato.com/congregation-clapping-along-to-gospel-music-during-G4W6EV8) · [People raising their hands while praying](https://elements.envato.com/group-of-people-raising-their-hands-while-praying--VZ4UW79)
- **about-1**: [Young woman in a church pew listening to the sermon](https://elements.envato.com/young-woman-sitting-in-church-pew-with-congregatio-H9MJE8Q) · [Group singing in a church choir](https://elements.envato.com/group-of-people-singing-in-choir-in-church-HU6UK6F)
- **about-2**: [Mother praying with her children over a Bible](https://elements.envato.com/bible-hands-or-mom-praying-with-children-siblings--WBDYKJQ) · [Grandmother praying with the kids](https://elements.envato.com/bible-prayer-or-hands-of-grandmother-with-kids-or--8EPBDU3)
- **sermon**: [Pastor raising hands while preaching](https://elements.envato.com/pastor-raising-hands-while-preaching-to-congregati-TZUCJRF) · [Preacher giving a sermon to the congregation](https://elements.envato.com/preacher-giving-sermon-to-congregation-in-church-MUHRYSK)

Unsplash photo credits: Jonas Verstuyft (hero), Karl Fredrickson (sanctuary), Alabaster Co (Psalms), Will Bolding (hills), Olesia Buiar (candle).

## Files

```
mpraeso-presby/
  index.html        all content
  css/styles.css    design (colours and fonts at the top)
  js/main.js        church settings, services, events, countdown, form, motion
  assets/mark.svg   burning-bush mark (also the browser-tab icon)
  assets/photos/    drop the church's photos here
```

Fonts: Fraunces (headings) and Figtree (text), from Google Fonts. Colours: Presby blue `#0F2A4A`, cream `#F7F1E6`, flame gold `#E3A93F` and ember `#C8572B`, with a kente stripe in gold, green and ember.
