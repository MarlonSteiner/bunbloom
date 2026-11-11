# Bunbloom 🌷🐰

A ridiculously cute routine, to-do and focus tracker. Every routine you tick, every to-do you finish and every focus session you complete plants a flower in your garden.

**Open it:** https://marlonsteiner.github.io/bunbloom/
On iPhone or iPad: open in Safari, tap Share, then **Add to Home Screen**.

## What's inside

- **Today**: morning, daytime and evening routines, to-dos with due dates, a week strip with a flower per day, and a bunny who hops when you tick things off.
- **Garden**: petals you earn buy hats, glasses, treats and garden decorations. Flowers grow as you go, levels go from Seedling to Bloom Legend.
- **Focus**: a tulip grows in its pot while the timer runs. Give up and it wilts. Breaks included.
- **Progress**: streaks, week/month/year charts, a flower calendar, a year heatmap, a mystery pixel picture that reveals itself each month, and 17 stickers to collect.
- **Accounts**: username and password. Everything is saved on the device first and synced to the account in the background, so it works offline and on several devices. A recovery code shown at sign-up resets a forgotten password.

## How it's built

- Plain HTML, CSS and JavaScript, no build step. All art is SVG drawn in code (`js/art.js`).
- `js/data.js` keeps every record with the time it was last edited; the newest edit of each record wins, so a phone and an iPad can both work offline.
- `server/` is a small Vercel function (`bunbloom-garden`) with a private Vercel Blob store. Passwords are hashed with scrypt.

## Develop

```bash
node server/test/accounts.test.js   # account + sync rules
node server/test/local-server.js    # local API on :4191 (used automatically on localhost)
python3 -m http.server 5182         # the app
```

Deploy the server with `npx vercel deploy --prod` from `server/`. Pushing to `main` updates the app on GitHub Pages.
