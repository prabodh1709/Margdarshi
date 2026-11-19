# Margdarshi — Discipline Command Center

Margdarshi is an offline-first personal discipline and study-planning Progressive Web App (PWA). It helps a student plan recurring routines, track daily completion, prepare for GATE, practise coding, focus with an India Standard Time clock, review progress, and maintain consistency.

The application is designed to work locally without a backend. Supabase is optional and provides authenticated cross-device synchronization when configured.

## Main features

- Responsive desktop sidebar and mobile bottom navigation.
- Custom recurring and one-time timetable blocks with start/end times.
- Daily completion tracking, streaks, completion ring, category breakdown, and heatmap.
- Month, week, and day calendar views with daily reflection.
- GATE subjects, study sessions, PYQs, mocks, and revision tracking.
- Coding practice log with problem, platform, topic, and time details.
- Focus mode with live IST clock and supported Chromium Picture-in-Picture floating timer.
- Android Focus Lock: select distracting apps, grant Android Accessibility and overlay access, and keep selected apps covered until the active task is completed.
- End-of-day analysis after 9:30 PM IST with next-day workload suggestions.
- Hindi/Sanskrit daily guidance with an offline fallback.
- Browser notifications when supported and an installable offline PWA shell.
- Optional Supabase email authentication and per-user cloud synchronization.
- Google OAuth sign-in/sign-up through Supabase.

## Technology stack

- React 19
- TypeScript
- Vite
- Supabase JavaScript client (optional cloud sync)
- Vitest
- HTML, CSS, and browser local storage
- Capacitor Android shell with a native AccessibilityService for Focus Lock

## Requirements

- Node.js 20.19 or newer
- npm
- A modern browser such as Chrome, Edge, or Firefox

## Run locally

From the project root:

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Run checks and create a production build

```bash
npm test
npm run build
npm run preview
```

The production files are generated in the `dist/` folder. `npm test` runs the automated test suite and `npm run build` performs TypeScript checking before creating the Vite production bundle.

## Android Focus Lock build

The repository includes a Capacitor Android project under `android/`. The Android app is the required installable version for external-app locking; a normal browser/PWA cannot cover other apps.

1. Install Android Studio, the Android SDK, and a JDK supported by the installed Capacitor version.
2. Open the project in Android Studio, or run `npm run android:debug` from the project root.
3. Install the generated debug APK on an Android device.
4. Open **Profile → Android Focus Lock** in Margdarshi.
5. Use **Open Accessibility settings**, enable **Margdarshi Focus Lock**, then use **Allow overlay** and enable **Display over other apps**.
6. Load installed apps and select the apps to protect.
7. Start a scheduled task and tap **Focus mode**. The selected apps remain covered until the task is completed; the app also provides an emergency stop path.

Useful commands:

```bash
npm run cap:sync
npm run android:debug
```

The native service uses explicit user-granted Android settings access. It does not hide permissions or attempt to prevent the user from uninstalling the app or revoking access.

## Optional Supabase cloud sync

The app works with local browser storage even when Supabase is not configured. To enable login and cross-device sync:

1. Create or open a Supabase project.
2. Enable Email authentication in **Authentication → Providers**.
3. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
4. Copy `.env.example` to `.env`.
5. Add the project URL and the publishable/anonymous key:
6. Restart the development server after changing `.env`.
7. Use **Cross-device sync** in the Motivation page to sign in and synchronize the profile.

### Enable Google sign-in

1. In Supabase, open **Authentication → Providers → Google** and enable it.
2. Create a Google OAuth client in Google Cloud Console and copy its client ID and secret into Supabase.
3. In Supabase **Authentication → URL Configuration**, add the deployed HTTPS URL to the allowed redirect URLs. For local testing, add `http://localhost:5173` (or the Vite URL shown in the terminal).
4. Restart Margdarshi and use **Continue with Google** on the first screen.

The button is already included in the app. Until the Google provider is enabled in Supabase, it will show a configuration message instead of opening Google.

The database schema uses row-level security so an authenticated user can access only that user's `app_state` row. Never place a Supabase service-role key, database password, or private API key in a `VITE_` variable or in GitHub.

## Deployment

Margdarshi is a static Vite application. It can be deployed to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any HTTPS static host.

Recommended settings:

```text
Build command: npm run build
Output directory: dist
```

For a hosted build, add these environment variables in the hosting provider before deployment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

After deployment, add the final HTTPS site URL in Supabase **Authentication → URL Configuration** as the Site URL and, where required, as an allowed redirect URL.

## Project structure

```text
Margdarshi/
├── public/              PWA manifest, service worker, and static assets
├── screenshots/         Application screenshots used for documentation
├── src/                 React components, pages, storage, and tests
├── supabase/schema.sql  Database table and row-level-security policies
├── docs/                 Project documentation and report files
├── .env.example         Safe environment-variable template
├── index.html            Vite HTML entry point
├── package.json          Scripts and dependencies
└── vite.config.ts       Vite configuration
```

## Data and privacy

Without Supabase, study data remains in the browser's local storage. Clearing site data removes the local profile. With Supabase enabled, the authenticated user's application state is synchronized to that user's protected database row. Do not commit `.env`, passwords, database credentials, or real personal records.

## Known browser limitations

Notification timing depends on browser and operating-system permissions. Reliable background push notifications require a separate push service. Picture-in-Picture floating focus mode is available only in browsers that support the required API; the in-app full-screen focus view remains available as a fallback.

## Repository

The complete source code is maintained at:

https://github.com/prabodh1709/Margdarshi
