# Instagram setup for Hisaab Kitab

Everything in this document is behind your login, so it is the one part of the
pipeline I cannot do. It is about **45 minutes**, once. After it, reels post
themselves.

At the end you will have two values to paste into GitHub. That is the entire
handover.

---

## Before you start — the one thing that can go badly wrong

**Do not create the Instagram account through automation, and do not use an
existing personal account you care about.** Meta bans accounts created or driven
by scripts, and a ban is permanent and takes the linked Facebook Page with it.
Everything below is done by hand in a browser, on purpose.

Also: **the money channel gets its own account.** Not the Rajneeti one. The code
refuses to fall back to another channel's token specifically so that a missing
secret can never post money content to the game's audience — it throws instead.
That is deliberate and worth keeping.

---

## What you are building

```
   your phone                         GitHub Actions                 Instagram
  ┌──────────┐    approve/skip     ┌────────────────┐   video URL   ┌────────┐
  │ approve  │ ──────────────────► │ publish job    │ ────────────► │  Reel  │
  │  page    │                     │ (Mon/Wed/Fri)  │               └────────┘
  └──────────┘                     └────────────────┘
```

Instagram never receives a file. It receives a **public URL** and fetches the
video itself — which is why the Supabase storage bucket has to stay public.
That is a requirement of Meta's API, not a shortcut.

---

## Step 1 — The Instagram account (5 min)

1. Sign up for a new Instagram account. Use a handle you are happy with for
   years — changing it later breaks links people have shared.
2. Open the app → **Settings → Account type and tools → Switch to professional
   account**.
3. Choose **Creator** (not Business). Category: *Personal finance* or
   *Education*.

Professional is required. The Content Publishing API refuses personal accounts.

## Step 2 — The Facebook Page (5 min)

An Instagram Creator/Business account must be connected to a Facebook Page
before the API will touch it. You do not have to use the Page for anything.

1. facebook.com → **Pages → Create new Page**. Name it the same as the channel.
2. On the Page: **Settings → Linked accounts → Instagram → Connect account**.
3. Sign in with the new Instagram account.

Verify it worked: the Page's Settings → Linked accounts should now show the
Instagram handle. If it does not, nothing later will work, so fix it here.

## Step 3 — The Meta app (10 min)

You already have a Meta app for the Rajneeti channel. **Use the same one.** One
app can serve several accounts, and a second app means a second review process
for no benefit.

1. developers.facebook.com → **My Apps** → your existing app.
2. **App settings → Basic** — confirm the app is in **Development** mode
   (top bar). Development mode is what lets you skip App Review, which
   otherwise takes 2–4 weeks.
3. **App roles → Roles → Instagram Testers → Add people**. Enter the new
   Instagram handle.
4. Now accept the invite **from the new account**: instagram.com → **Settings →
   Website permissions → Tester invites → Accept**.

That last step is missed more often than any other. Without it every API call
returns a permissions error that does not mention testers at all.

## Step 4 — The token (15 min) — and the business-verification question

**You do not need to verify business details for this.** That is worth stating
plainly, because Meta's own documentation makes it sound otherwise and the
requirement is real — it just does not apply to what we are doing.

Meta has two access levels:

| | What it is for | Business verification |
|---|---|---|
| **Standard Access** (default) | apps used only by people who have a **role** on the app — you, your own accounts | **Not required** |
| **Advanced Access** | apps serving Instagram accounts you do **not** own or manage | Required, plus App Review |

We only ever publish to your own account, and step 3 gave that account a role
on the app (Instagram Tester). So this stays on Standard Access, in Development
mode, and never needs business verification or App Review.

> **This is why the System User token is NOT the path here.** System users live
> inside a Meta Business portfolio, and that route does require business
> verification first. An earlier version of this document recommended it, on the
> strength of it never expiring. That was wrong for anyone who has not verified
> a business, and verifying one to avoid a 60-day refresh is a bad trade.

### Get a long-lived token instead

1. developers.facebook.com → **Tools → Graph API Explorer**.
2. Select your app. Under **User or Page**, choose **Get User Access Token**.
3. Tick these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. **Generate Access Token** and sign in. What you now have is *short-lived* —
   about an hour. Do not stop here.
5. Exchange it for a long-lived one. In a browser, replacing the three values:

   ```
   https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=YOUR_APP_ID
     &client_secret=YOUR_APP_SECRET
     &fb_exchange_token=THE_SHORT_LIVED_TOKEN
   ```

   App ID and secret are in **App settings → Basic**. The response contains an
   `access_token` valid for **60 days**.

6. Use that long-lived token for step 5, and keep it — it is what goes into
   GitHub.

### The 60-day problem, and what the pipeline does about it

A token that expires quietly is how these integrations actually die: posting
stops, nothing errors visibly, and nobody notices for a fortnight.

So the publish job checks the token's remaining life before every run and
**fails loudly with the number of days left** once it drops under two weeks.
You get a failed workflow run and an email while there is still time to act,
rather than silence.

To refresh, repeat step 4 — it takes about two minutes, roughly six times a
year, and updating the secret is the whole job.

> Do not paste the token into a chat, an issue, or a commit. If it leaks, go to
> **App settings → Basic → Reset App Secret**, which invalidates every token
> issued with it, then redo this step.

## Step 5 — Your Instagram user ID (2 min)

This is a number, not your handle.

1. developers.facebook.com → **Tools → Graph API Explorer**.
2. Pick your app, paste the long-lived token from step 4 into the token box.
3. Run:

   ```
   GET /me/accounts
   ```
   Find your Page and copy its `id`.

4. Then run, with that Page id:

   ```
   GET /<PAGE_ID>?fields=instagram_business_account
   ```

   The response contains:

   ```json
   { "instagram_business_account": { "id": "17841400000000000" } }
   ```

That 17-digit number is what you need. **Not the Page id, and not your handle.**

## Step 6 — Hand it over (3 min)

GitHub → the repo → **Settings → Secrets and variables → Actions → New
repository secret**. Add two:

| Name | Value |
|---|---|
| `IG_TOKEN__MONEY` | the long-lived token from step 4 |
| `IG_USER_ID__MONEY` | the 17-digit number from step 5 |

The names must match exactly, including the double underscore. The code reads
these and **throws with a readable message** if either is missing, rather than
guessing — so a typo fails loudly on the next run instead of posting to the
wrong account.

---

## Step 7 — Prove it works before it posts anything

**Actions → Money Reel Publish → Run workflow → `dry_run: true`.**

This runs the full publish path and stops at the last moment, logging exactly
what it would have sent. Read that log. It should name the right Instagram
account id and a playable video URL.

Only when the dry run looks right, run it again with `dry_run: false`.

The first genuinely public post is yours to trigger. I will not push a first
post to a real audience on my own.

---

## When something breaks

| What you see | What it means |
|---|---|
| `(#200) Permissions error` | Step 3.4 — the tester invite was never accepted inside Instagram |
| `(#190) Invalid OAuth access token` | The 60-day token expired, or the app secret was reset. Redo step 4 and update the secret |
| `Media ID is not available` | Instagram is still fetching the video. The code already polls for this; if it persists the video URL is not publicly reachable |
| `The video file is not supported` | Not our render — check the Supabase URL opens in a private browser window with no login |
| Posts appear on the wrong account | Stop. `IG_USER_ID__MONEY` holds the Rajneeti id. The code cannot cause this; the secret is wrong |

**A note on how it fails.** The token is the fragile part of any Meta
integration, and the classic disaster is that it expires quietly and nobody
notices for a fortnight. Two things guard against that here. The publish job
asks Meta how many days the token has left BEFORE it does anything, and fails
with that number once it drops under two weeks. And a 190 error is treated as
fatal rather than logged and skipped. If publishing ever stops, you get a failed
run and an email, not silence.

---

## What happens after

Nothing, from you, except about a minute on posting days.

- **Mon/Wed/Fri, 07:00 IST** — a reel is written, voiced, rendered and uploaded.
  A row appears on the approve page with the script and the numbers it claims.
- **You** open the approve page on your phone and tap Approve or Skip.
- **Mon/Wed/Fri, 19:00 IST** — everything approved is posted.

Skip a day and nothing posts that day. Nothing breaks, nothing queues up.

Both schedules are currently commented out in the workflow files. Once you have
posted successfully by hand, tell me and I will switch them on — that is a
one-line change in each file, and it should not happen before a real post has
worked end to end.
