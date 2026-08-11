# What to run on the wowsims web UI — 2026-08-11

Everything below is a click-by-click protocol. It exists to settle four things
our own sims cannot settle from this side. You do **not** need to know anything
about our pipeline to do it.

Total: 8 sim runs plus one screenshot. Expect 20–40 minutes at 25000 iterations.

Where I am not certain what the site's UI looks like, the step says **"if the UI
differs, note what you see"** — in that case write down what you actually saw
rather than forcing the step. A note that the UI does not work the way I assumed
is a useful result, not a failure.

---

## The four questions, in one sentence each

1. **The T6 package number.** Our engine says the four Thunderheart pieces are
   worth **+113.4 DPS** on your gear and rotation; you remember **+97**. That
   remembered figure predates your settings export, has no saved result, and we
   do not know its iteration count or how it was rounded. We need a fresh one,
   read precisely.
2. **The gloves socket.** Your current gloves have no sockets; the T6 gloves have
   one. We believe the site leaves that new socket **empty** when you equip them
   — and our engine fills it with a gem you do not own, which we think overstates
   our number by about 10 DPS. One screenshot settles it.
3. **The helm A/B.** Our engine says Cursed Vision of Sargeras beats Vengeful
   Gladiator's Dragonhide Helm by **+8.6 DPS**; you remember about +10. Probably
   just rounding, but confirm it precisely and this closes.
4. **The build version.** So your numbers can be compared against the sim
   version we run (`v0.0.101`).

---

## Step 0 — Setup

1. Open the wowsims TBC site and go to the **Feral Druid** sim.
2. **Record the build/version string.** It is usually in the page footer or an
   "About"/version link, and often looks like `v0.0.1xx` or a short commit hash.
   Write down exactly what you see, verbatim. *If you cannot find one at all,
   write down "no version string visible" plus the date you ran this — that is
   still useful.*
3. Load **your own settings** — the ones you exported to us as
   `owner-settings-export-v2.json`. If your browser still has them from last
   time, that is fine. If you want to be sure they are exactly the ones we have
   been comparing against, use the site's **Import** (usually under a
   settings/gear-menu icon, "Import → JSON" or similar) and paste in the contents
   of that file.
   - Do **not** import `our-settings-for-web-import.json` for any of the runs
     below. That file is *our* configuration, and it deliberately differs from
     yours — it uses a different rotation (the default APL instead of your simple
     biteweave/mangle-trick one) and slightly different gear trim. It is only
     useful for an optional parity check; see the appendix at the end. Every
     numbered run in this protocol must be on **your** setup.
4. **Set the iteration count explicitly** to **25000** (there is normally an
   iterations box near the "Simulate"/"DPS" area, sometimes under a settings
   cog). Write the number down. Use the same value for every run below — the
   comparison only works if all eight runs share it.
   - Why 25000: high enough that the run-to-run wobble is around a tenth of a
     DPS, which is far smaller than the ~6 and ~16 DPS gaps we are chasing. Any
     number ≥25000 is fine as long as it is the same for all runs.
5. Confirm the rotation is your usual one: **Simple** rotation with *biteweave*,
   *mangle trick*, *maintain faerie fire*, rip and bite at 5 combo points. That
   is what your export has and what we measured against.
6. Sanity-check the gear. Head should be **Wolfshead Helm** (8345), shoulders
   **Mantle of Malorne** (29100), chest **Breastplate of Malorne** (29096), hands
   **Gloves of the Searing Grip** (29947), legs **Skulker's Greaves** (28741). If
   any of that looks wrong, stop and tell us — we have already been burned once
   by a settings export carrying gear you did not actually have.

---

## Step 1 — Baseline run (your current gear, unchanged)

1. Do not change any gear or gems. Click **Simulate**.
2. **Record the DPS to as many decimals as the site shows you.** The big headline
   number is usually rounded to one or two decimals. If you can get more
   precision, do — likely places to look:
   - hovering the DPS number, which often reveals a fuller value in a tooltip;
   - the results detail/breakdown panel;
   - an **Export → JSON** on the *results* if the site offers one (this is the
     single most valuable artifact — see the checklist).
   - *If the UI differs and none of those exist, just write down the headline
     number exactly as displayed and note how many decimals it showed.* Knowing
     it was rounded to, say, one decimal is itself part of the answer.
3. Also record the **error bar / standard deviation** if one is displayed next to
   the DPS.

Call this number **BASELINE**.

*Why it matters: every other number below is measured as a difference from this
one, so if this is off, all of them are.*

---

## Step 2 — The T6 package (four Thunderheart pieces)

This is the big one. Do it in two passes and record a number after each.

### 2a — Equip the four pieces, change nothing else

Equip, one slot at a time, leaving every other slot and every other gem alone:

| slot | item to equip | item id |
|---|---|---|
| shoulders | **Thunderheart Pauldrons** | 31048 |
| chest | **Thunderheart Chestguard** | 31042 |
| hands | **Thunderheart Gauntlets** | 31034 |
| legs | **Thunderheart Leggings** | 31044 |

Do **not** touch head, neck, back, wrist, waist, feet, rings, trinkets, weapon or
idol. Do **not** run "suggest gems" yet.

Expect the site to show you **losing** the Malorne Harness 2-piece (your
shoulders and chest are both Malorne) and **gaining** the Thunderheart Harness
4-piece. That is correct and expected — both sides of our comparison do the same
thing, so it is not a confound. If the set bonuses light up differently from
that, say so.

### 2b — BEFORE re-gemming, record the socket state of each new piece

This is question 2, and it is the whole reason for doing 2a and 2c separately.
For each of the four pieces just equipped, look at its socket row in the gear
panel and write down **which sockets have a gem in them and which are empty**.
A screenshot of the four items' socket rows is ideal.

What we expect to see, so you know what you are checking against:

| piece | sockets it has | our prediction |
|---|---|---|
| Pauldrons 31048 | 1 yellow, 1 blue | both filled with your Delicate Living Rubies carried over from your old shoulders |
| Chestguard 31042 | 1 blue, 1 yellow, 1 red | all three filled with carried-over Delicate Living Rubies |
| Gauntlets 31034 | **1 blue** | **EMPTY — this is the one that matters** |
| Leggings 31044 | 1 blue | one carried-over Delicate Living Ruby (your old legs had 3 gems, only 1 can carry over) |

**The gloves socket is the load-bearing observation.** Your current gloves
(Gloves of the Searing Grip, 29947) have **no sockets at all**, so there is no
gem to carry into the new gloves' socket. We believe the site therefore leaves it
empty. Our engine instead auto-fills it with a **Delicate Crimson Spinel**
(32194, a Phase-3 epic +10 agility gem) that you do not wear anywhere. If the
site really leaves it empty, that confirms our engine is inventing a gem you do
not own, which we measured as ~10 DPS of overstatement.

*If the UI differs — e.g. it auto-fills the socket for you, or shows some
placeholder — note exactly what you see. That answer flips the conclusion, so it
is important either way.*

3. Now click **Simulate** with the sockets in whatever state 2b found them.
   Record the DPS the same way as Step 1. Call this **PKG_NOREGEM**.

*Why it matters: this is the honest "what you'd actually see the moment you equip
the four pieces" number, and it is the one our +113.4 is supposed to match.*

### 2c — Now use "suggest gems"

1. Use the site's **suggest gems / auto-gem** feature (usually a button or
   right-click menu on the gear panel), with **the phase and rarity limits you
   would normally use** — i.e. restrict it to gems you would actually buy/own,
   not "any gem in the game". Write down which limits you set (e.g. "up to Phase
   3, epic allowed" or "rare only").
2. **Record what gem it puts in the gloves socket** (name and, if shown, the
   item id). Also note any *other* gem it changed anywhere in your gear —
   auto-gem features sometimes rework more than the empty socket, and if it did,
   we need to know which slots moved.
3. Click **Simulate**. Record the DPS. Call this **PKG_SUGGESTED**.

*Why it matters: this brackets the answer. PKG_NOREGEM is the floor (equip and
walk away) and PKG_SUGGESTED is what a player who bothers to gem would get. Our
+113.4 should sit between them, and where exactly it sits tells us whether our
auto-fill choice is defensible or too generous.*

**Two package numbers to report**, each as a difference from BASELINE:
- `PKG_NOREGEM − BASELINE`
- `PKG_SUGGESTED − BASELINE`

Please report the **raw DPS values too**, not just the differences — we want to
check the baseline independently.

---

## Step 3 — The helm A/B

**First, restore your gear to the Step 1 baseline** — put the four original
pieces back (shoulders 29100, chest 29096, hands 29947 Gloves of the Searing
Grip, legs 28741 Skulker's Greaves) with their original gems. If it is easier,
re-import your `owner-settings-export-v2.json` to reset cleanly, then re-set the
iteration count to 25000 (imports often reset it).

Your head slot is Wolfshead Helm, which has **no sockets**. Both candidate helms
have **two sockets: one meta and one yellow**. So for each helm you will need to
socket two gems, and they must be **the same two gems in both runs** or the
comparison is meaningless.

Use these two, which is what our engine used:

- meta socket: **Relentless Earthstorm Diamond** (32409)
- yellow socket: **Delicate Crimson Spinel** (32194) — a red gem in a yellow
  socket, which is deliberate; if you would rather use **Delicate Living Ruby**
  (24028) because you own those, that is fine too, **as long as you use the same
  one in both runs**. Write down which you used.

**The meta gem must be ACTIVE in both runs.** Relentless Earthstorm Diamond
requires at least 2 red, 2 yellow and 2 blue gems elsewhere in your gear. Your
gear is heavily red, so the site will likely tell you the meta is inactive and
you will need to recolour a couple of gems (our engine changed two shoulder gems
to make it work: a **Glinting Pyrestone** 32220 and a **Shifting Tanzanite**
30549 in the shoulder slot). However you achieve it:

- **Confirm the site shows the meta as active** (it normally greys out or flags
  an inactive meta) before simming.
- **Use the identical gem layout for both helm runs.** The only thing that may
  differ between run 3a and run 3b is the helm item itself.

### 3a
Equip **Cursed Vision of Sargeras** (32235), socket as above, confirm meta
active. Simulate. Record DPS → **CURSED**.

### 3b
Swap only the helm to **Vengeful Gladiator's Dragonhide Helm** (33672), keeping
every gem exactly as in 3a, confirm meta still active. Simulate. Record DPS →
**VENGEFUL**.

Report `CURSED − VENGEFUL`. Our engine says **+8.61**; you remembered about +10.

*Why it matters: if the precise difference is ~8.6, this question is closed and
we stop chasing it. If it is genuinely ~10 at 25000 iterations, something in one
of the two helms' stats resolves differently on the web than in our database and
we need to look at that.*

*Note: Vengeful Gladiator's Dragonhide Helm is part of the Gladiator's Sanctuary
set. If you happen to be wearing other pieces of that set, a set bonus could
activate and skew the comparison — you are not, per your export, but if the site
shows a set bonus lighting up, tell us.*

---

## Step 4 — Two ids we want a second opinion on

Two items in your gear have ids that look out of range for TBC to our tooling:
**278827** (your neck) and **278819** (your back) — we read them as
`Amulet of Bitter Hatred` and `The Frost Lord's War Cloak`, an Ahune/Frost Lord
block. They are worth about +97 DPS combined, so if the web resolved them
differently from us, every absolute number above shifts.

**Just hover each and write down the tooltip's item name and its stat lines.**
No sim needed. One minute.

---

## Send-back checklist

Tick these off:

- [ ] Web build/version string (verbatim), and the date you ran this
- [ ] Iteration count used (should be 25000, same for all runs)
- [ ] Which gem set you used in the helm sockets (32194 or 24028 in the yellow)
- [ ] **BASELINE** DPS, with as many decimals as shown + its error bar
- [ ] **PKG_NOREGEM** DPS (four T6 pieces equipped, nothing re-gemmed)
- [ ] **PKG_SUGGESTED** DPS (after suggest-gems) + which phase/rarity limits you set
- [ ] Which gem suggest-gems put in the **gloves** socket, and any other gem it moved
- [ ] **Screenshot or written note of all four T6 pieces' socket state before re-gemming** — especially whether the gloves socket was empty
- [ ] **CURSED** DPS and **VENGEFUL** DPS, plus confirmation the meta showed active in both
- [ ] Tooltip names + stats for items **278827** (neck) and **278819** (back)
- [ ] **If the site can export results as JSON: the exported result files.** This is worth more than everything else on the list combined, because it carries full precision and the iteration count together.
- [ ] Anything where the UI did not match what these instructions assumed

---

## Appendix — optional parity check (skip unless you have spare time)

`our-settings-for-web-import.json` is our configuration expressed in the site's
own import format. Importing it and simming would tell us whether the site and
our command-line sim agree on the *same* inputs — a pure apples-to-apples check
of the two engines.

Two warnings if you do it:

- **Import it into a separate browser tab or profile**, or re-import your own
  settings afterwards, so it does not overwrite your setup.
- Its companion note (`our-settings-for-web-import.md`) contains a gear
  comparison table that is **out of date** — it was written against your first
  export, the one with the wrong gear. Ignore that table. The rotation difference
  it describes (our default APL vs your Simple rotation) is still accurate and is
  the main thing that file will look different in.

If you do run it, just record the baseline DPS and the iteration count; that is
all we would use.
