# MARGDARSHI — Discipline Command Center

An offline-first PWA for a daily routine, GATE preparation, coding practice, meditation, reviews, consistency, and practical daily motivation.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`, then serve the `dist/` directory through an HTTPS-capable host.

## What is included

- Responsive desktop sidebar and mobile bottom navigation.
- Empty, user-defined timetable from first launch: add only the recurring or one-off blocks you want, with per-task start/end times, live duration preview, one-day versus recurring edits, exact completion timestamps, and undo.
- Dashboard metrics, daily completion ring, dynamic GATE/coding bars, category breakdown, streaks, and stored-data heatmap.
- Interactive month/week/day calendar plus day detail and daily reflection.
- GATE subjects, study/PYQ/mock/revision entries; coding problem/time/platform/topic entries.
- Live India Standard Time focus clock for the active task, a full-page focus view, and an always-on-top floating Picture-in-Picture clock in supported Chromium desktop browsers.
- India-time end-of-day analyzer: activates at 9:30 PM IST, evaluates completed and remaining sessions, identifies strong/weak areas, carries forward priority work, and creates a deadline-aware next-day workload after you set a goal target.
- MARGDARSHI daily guidance with an offline, data-aware Hindi/Sanskrit curated fallback.
- Local notifications (when the browser allows them), light/dark mode, installable manifest, and offline application shell.

## Data and privacy

The app works immediately with local browser storage. No study data or secret is sent anywhere by default. Clearing the browser's site data clears the local-only profile, so use cloud sync or browser backup for long-term storage.

## Optional cross-device sync (Supabase)

1. Create a Supabase project and enable **Email** sign-in in Authentication.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
3. Copy `.env.example` to `.env` and set:

   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

4. Restart the dev server, then use **Cross-device sync** in the Motivation page to request a passwordless magic link. Once connected, updates are saved locally first and automatically synchronized shortly afterward; **Sync now** is available as a manual retry.

The anonymous/publishable key is designed for browser use; the schema's row-level security protects each account's row. Do not put service-role keys or an AI-provider key in any `VITE_` variable.

## AI integration

MARGDARSHI has a fully offline fallback by design, so it remains reliable without an API key. For a generative assistant, add a server-side endpoint (or Supabase Edge Function) that holds the provider key and receives only the progress summary it needs. Never send a provider key to the frontend.

## Android and laptop installation

- **Android:** Deploy the production build over HTTPS, visit it in Chrome, then choose **Install app** / **Add to Home screen**. Allow notifications if wanted.
- **Laptop:** Open the HTTPS site in Chrome or Edge and use the install icon in the address bar. The installed application works offline after its first load.

## Notes

PWA notification scheduling is subject to browser and operating-system background limits; the app presents five-minute-before reminders while it is active. Reliable background push requires a server-side push service and user subscription, which is intentionally not configured without your own credentials. Likewise, a standard browser app cannot overlay every native application: use **Open floating clock** in Chrome/Edge for the always-on-top Picture-in-Picture timer, or **Expand** for the in-app full-screen fallback.
