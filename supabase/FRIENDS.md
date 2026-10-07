# Activate Friends and streaks

Your existing accounts and deck sync stay in place. To activate sharing, open the same Supabase project’s **SQL Editor**, paste the complete contents of [friends.sql](friends.sql), and run it once. This migration can also be rerun safely. It requires the earlier [setup.sql](setup.sql). No new service, paid AI or credentials are needed.

After GitHub Pages updates:

1. Sign in and open **Friends & streaks** (on a phone, **Friends** in the lecture strip).
2. Choose a display name and share your friend code manually. The other person must sign in and open Friends to create their own code.
3. Enter their code to send a request. They select **Refresh**, then **Accept**. Pending requests do not share study totals.
4. Both users can compare **Today** or **Last 7 days** and see current streaks and overall progress. Study, wait for deck sync, then use **Refresh** to update totals. Removing a friend immediately revokes server access to their aggregate progress. The other browser may show an already-loaded snapshot until it refreshes.

## How counting works

- A source slide counts once per lecture per study day after any of its cards is rated, including Again. Reviewing several cards from the same slide does not multiply slide points. Repeating one card does not inflate the daily card count.
- Last 7 days totals add the daily slide counts: reviewing the same slide on another day counts toward that day’s consistency.
- A streak is consecutive study days with at least one card rated. If today has no review yet, yesterday’s streak remains alive until midnight. Missing a whole day breaks it. Every user uses **Europe/London midnight**, including British summer time, so leaderboard day boundaries agree.
- Overall cards studied means rated at least once. A slide is **fully studied** once every card linked to that slide has been rated at least once. These are coverage measures; scheduled refreshers still return and Again does not indicate mastery.
- Daily history starts with this app update. Existing reviewed cards contribute to overall coverage, but old daily totals and streaks cannot be accurately reconstructed from the previous last-review-only records.
- Activity is saved inside each private deck and merges by day/card across devices, including offline reviews that upload later. Historical activity survives card deletion. Guest streaks stay in that browser until their deck history is imported into an account.

## Privacy and validation

Accepted friends receive only the display name and aggregate counts/history. Private deck contents, source pictures, answers, email addresses, and other users’ friend codes are never returned by the social dashboard. Friend codes are opt-in: share yours with people you want to study with. A recipient must explicitly accept a request. Only either participant may remove the relationship. No emails or external messages are sent by the Friends feature.

The database computes totals from each user’s saved decks instead of trusting a posted leaderboard score. This is friendly, self-reported study activity, not an exam result or a tamper-proof contest: users control their own decks, device clocks, and ratings. No prizes or purchases are involved.

Automated SQL tests exercise actual PostgreSQL-compatible permissions and aggregation with three users, including consent, anonymous/outsider denials, helper-function restrictions, removal and repeat migration. Browser tests use fixture responses for the friend flow. Live sharing still needs the owner to run this migration and check with two real accounts; the assistant cannot execute owner SQL with the app’s public key.

To rerun the browser checks locally, build with no `VITE_SUPABASE_*` overrides, start `npm run preview -- --port 4189`, then run `npm run test:friends:browser`. Fixtures override the public project configuration and never send real friend requests. Use `CHROMIUM_PATH` if using an existing Chromium executable; otherwise install Playwright Chromium first.
