<<<<<<< HEAD
# ECORET Chairman App

React Native (Expo) + TypeScript, offline-first, talking to your
Django/DRF backend.

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios`
for a simulator/emulator. Backend expected at
`http://127.0.0.1:8000/api` — **note:** if you're testing on a physical
phone, `127.0.0.1` means the phone itself, not your dev machine. Use
your machine's LAN IP (e.g. `http://192.168.x.x:8000/api`) in
`src/api/endpoints.ts` instead, or an Android emulator's
`http://10.0.2.2:8000/api`.

## What's here

- `src/api/endpoints.ts` / `src/api/client.ts` — same pattern as the
  web portal, confirmed against your `urls.py`.
- `src/storage/secureStore.ts` — JWTs live in iOS Keychain / Android
  Keystore via `expo-secure-store`, not AsyncStorage (which isn't
  encrypted).
- `src/offline/actionQueue.ts` — SQLite-backed queue. Every offline
  action (approve a loan, record a repayment, mark attendance) gets
  written here with a client-generated `idempotency_key` before it
  ever touches the network.
- `src/offline/syncEngine.ts` — flushes the queue to `apps/sync`'s
  `SyncView.POST` when connectivity returns (listens via NetInfo), and
  pulls fresh data via `SyncView.GET`.
- `src/auth/AuthContext.tsx`, `src/screens/LoginScreen.tsx`,
  `src/screens/HomeScreen.tsx`, `src/navigation/RootNavigator.tsx` —
  same auth pattern as the web portal, adapted for React Native.

## Backend work still needed — not just frontend gaps

These aren't things I can fix from the app side; they need changes in
your Django project before offline sync is safe to rely on for real
money-moving actions:

1. **`SyncView.GET` returns everything every time.** `DeviceSync.last_sync_at`
   is recorded but never used to filter the response. Fine for a demo,
   but as loan/repayment/attendance history grows this will get slow
   and burn a chairman's mobile data on every sync. Needs a `?since=`
   param that filters each queryset by `updated_at__gt`.

2. **No idempotency check on `SyncView.POST`.** The action queue here
   attaches an `idempotency_key` to every queued action, but
   `apps/sync/views.py`'s `process_loan_sync` / `process_repayment_sync`
   / etc. don't check it — they just create/update based on whether an
   `id` is present. If a sync flush is retried after a network blip
   partway through (network drops after the request was sent but
   before the phone got the response), the same repayment could get
   recorded twice. This is the single most important backend fix
   before this app touches real loan/savings data.

3. **No server-side validation on synced financial actions.** The
   `create` methods on `LoanViewSet`/`SavingViewSet` check things like
   min/max loan amount and group active status — `process_loan_sync`
   in `apps/sync/views.py` does not, it just calls
   `Loan.objects.create(**loan_data)` directly. An offline-approved
   loan that violates `LoanSettings` limits would currently sail
   through sync without any of those checks.

## Still needs building

Only login + a home screen with a manual "sync now" button exist.
Not yet built: loan approval screen, repayment recording, attendance
marking, case penalty payment, push notification handling (device
token registration hook exists in `endpoints.ts` as
`auth.registerDevice` but isn't called anywhere yet).
=======
# ECORET-MOBILE-APP
>>>>>>> 79a1cca3f777297c0783b57663edb3e2173533fe
