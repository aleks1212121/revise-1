# Free phone notifications for the admin slide inbox

Notifications are opt-in per browser and available only to accounts with server-verified admin membership. A PostgreSQL INSERT trigger queues a background request through Supabase pg_net; the Edge Function sends encrypted Web Push messages. The app does not need to remain open. No OpenAI key, paid notification provider, extra Codex credential, or manually copied VAPID key is required.

## Activate once

1. Open CHUDS → My account → enable Admin mode → Open admin area → Phone notifications → One-time Supabase setup.
2. Use **Copy notification setup SQL** and run the entire query in the project's SQL Editor. It installs private subscription/configuration tables, guarded admin subscription RPCs and the INSERT trigger. Re-running the SQL preserves subscriptions and existing keys. It requires the existing admin.sql and Supabase's pg_net extension.
3. Use **Copy notification function code**. Deploy it in the Supabase Edge Functions editor as **slide-notifications**, replacing index.ts, with **Verify JWT disabled**. Browser requests are still authenticated with Supabase getUser and is_study_admin; trigger requests use a random server-only hook secret. Supabase supplies the function's standard project credentials. No new environment secrets need manual entry.
4. On the receiving phone, open the live CHUDS website in Chrome, sign in as admin, and press **Enable notifications**. Allow browser notification permission. The function generates VAPID keys once, keeps the private key and hook secret in a service-only RLS table, and returns only the public key to the browser.
5. Press **Send test notification**, then test with a new slide upload from a student account. A successful fixture test or a published UI is not evidence that the live database/function is activated.

Deploy via authenticated CLI, if available:

```
supabase functions deploy slide-notifications --project-ref tltmnjaserpbsfdhchqm --no-verify-jwt
```

## Phone behavior

Android Chrome supports notifications from HTTPS websites; installing the website is optional. On iOS/iPadOS 16.4 or later, add the site to the Home Screen and enable notifications from that installed app. Browser/OS notification settings, Do Not Disturb, battery/network restrictions and expired push subscriptions can delay or suppress alerts. Enable on each device separately; **Turn off on this browser** removes this admin's subscription and unsubscribes the current browser. Sign-out or turning Admin mode off does not disable an existing opt-in subscription; turn it off explicitly when needed.

Notifications deliberately contain no sender email, lecture title, slide content or review data. Tapping opens the admin inbox after a valid admin sign-in; no authentication credentials are included in the link. There is no service-worker offline cache of account data.

A notification is queued only for a new lecture_submissions row, not updates or status changes. The trigger never blocks slide upload when queueing fails. The notification function verifies that the submission exists, rechecks current admin membership before selecting recipients, validates push-provider destinations, and removes 404/410 expired subscriptions. Push-provider acceptance is not proof the phone displayed it; the test button asks the owner to check the device. Temporary push/network failures are reported as failed sends; this version does not schedule automatic retry jobs.

## Checks

`npm test` includes notification SQL permission/trigger tests, the Edge Function authentication/recipient/provider tests and the service-worker behavior tests. `npm run test:notifications:browser` exercises permission denial, enable/test/disable, failed setup, setup copying and admin/guest isolation on desktop and phone with fixtures. These checks make no live database writes and send no real push messages.
