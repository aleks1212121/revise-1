# Free phone notifications for the admin slide inbox

Notifications are opt-in per browser. Admins can enable new-slide inbox alerts; any signed-in account can enable alerts when its own submitted lecture deck is delivered. These preferences are independent. A PostgreSQL INSERT trigger queues a background request through Supabase pg_net; the Edge Function sends encrypted Web Push messages. The app does not need to remain open. No OpenAI key, paid notification provider, extra Codex credential, or manually copied VAPID key is required.

## Activate once

1. Open CHUDS → My account → enable Admin mode → Open admin area → Phone notifications → One-time Supabase setup.
2. Use **Copy notification setup SQL** and run the entire query in the project's SQL Editor. It installs private subscription/configuration tables, guarded admin subscription RPCs and the INSERT trigger. Re-running the SQL preserves subscriptions and existing keys. It requires the existing admin.sql and Supabase's pg_net extension.
3. Use **Copy notification function code**. Deploy it in the Supabase Edge Functions editor as **slide-notifications**, replacing index.ts, with **Verify JWT disabled**. Browser requests validate Supabase getUser, and inbox actions additionally require is_study_admin; trigger requests use a random server-only hook secret. Supabase supplies the function's standard project credentials. No new environment secrets need manual entry.
4. On the receiving phone, open the live CHUDS website in Chrome, sign in as admin, and press **Enable notifications**. Allow browser notification permission. The function generates VAPID keys once, keeps the private key and hook secret in a service-only RLS table, and returns only the public key to the browser.
5. Press **Send test notification**, then test with a new slide upload from a student account. A successful fixture test or a published UI is not evidence that the live database/function is activated.

Deploy via authenticated CLI, if available:

```
supabase functions deploy slide-notifications --project-ref tltmnjaserpbsfdhchqm --no-verify-jwt
```

## Student deck-ready alerts

After updating the notification SQL and re-deploying the same slide-notifications function, students use **Settings → Deck-ready notifications → Enable notifications** on their phone or laptop. Each device can send a test and turn its own ready alerts off. This never grants admin access or inbox alerts. The admin must initialize the server push keys once if they have not already done so. Existing subscriptions and keys survive rerunning setup.

An UPDATE trigger observes the original submission entering completed status, verifies a delivered `submission-UUID` deck exists in that sender's account, and queues the same private server hook with action deck-ready. The Edge Function independently verifies the submission, its completed status, the deck and original recipient. Only that user's ready-enabled subscriptions receive an alert. Repeated completed writes do not trigger another alert. Tapping opens the lecture collection after sign-in. No alerts are sent retroactively for previously completed submissions.

## Phone behavior

Android Chrome supports notifications from HTTPS websites; installing the website is optional. On iOS/iPadOS 16.4 or later, add the site to the Home Screen and enable notifications from that installed app. Browser/OS notification settings, Do Not Disturb, battery/network restrictions and expired push subscriptions can delay or suppress alerts. Enable on each device separately; **Turn off on this browser** disables the selected preference for the current account; the browser subscription is retained for its other preference. Sign-out or turning Admin mode off does not disable an existing opt-in subscription; turn it off explicitly when needed.

Notifications deliberately contain no sender email, lecture title, slide content or review data. Tapping opens the admin inbox after a valid admin sign-in; no authentication credentials are included in the link. There is no service-worker offline cache of account data.

Admin inbox alerts are queued only for new lecture_submissions rows. Student ready alerts are queued only for a completed transition with an existing delivered deck. The trigger never blocks slide upload when queueing fails. The notification function verifies that the submission exists, rechecks admin membership for inbox recipients, or filters to the original sender for ready recipients, validates push-provider destinations, and removes 404/410 expired subscriptions. Push-provider acceptance is not proof the phone displayed it; the test button asks the owner to check the device. Temporary push/network failures are reported as failed sends; this version does not schedule automatic retry jobs.

## Checks

`npm test` includes notification SQL permission/trigger tests, the Edge Function authentication/recipient/provider tests and the service-worker behavior tests. `npm run test:notifications:browser` exercises permission denial, enable/test/disable, failed setup, setup copying and admin/guest isolation on desktop and phone with fixtures. These checks make no live database writes and send no real push messages.
