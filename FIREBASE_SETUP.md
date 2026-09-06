# StreamPulse Firebase Authentication + Firestore Setup

The included `firebase-config.js` points to the Firebase project `StreamPulse` (`streampulse-3eb7a`).

## 1. Enable authentication

1. Open Firebase Console and select `StreamPulse` (`streampulse-3eb7a`).
2. Go to **Build → Authentication → Get started**.
3. Under **Sign-in method**, enable:
   - Google
   - Email/Password
4. Under **Authentication → Settings → Authorized domains**, add:

```text
akarenka.github.io
```

Do not include `https://` or the repository path.

## 2. Create Firestore

1. Go to **Build → Firestore Database → Create database**.
2. Choose a region close to the main audience.
3. Open the **Rules** tab.
4. Replace the editor contents with the included `firestore.rules` file.
5. Click **Publish**.

## 3. Publish website files

Upload these files together to the GitHub repository root:

```text
live.html
firebase-config.js
```

The page loads Firebase directly from Google's hosted web SDK. Do not upload service-account JSON, private keys, Cloudflare API tokens, or payment secrets.

## Firestore structure

```text
users/{uid}
users/{uid}/following/{roomId}
users/{uid}/testPurchases/{purchaseId}
liveRooms/{roomId}
liveRooms/{roomId}/followers/{uid}
liveRooms/{roomId}/subscribers/{uid}
liveRooms/{roomId}/messages/{messageId}
liveRooms/{roomId}/gifts/{giftId}
liveRooms/{roomId}/rankResets/{resetId}
```

The two gift rankings aggregate the latest 300 gift records in the active room:

- `type = points`: ranks supporters by total gifted Points.
- `type = subscribe`: ranks supporters by Subscribe gift count.

Only the authenticated `ownerUid` of a Room can use the three reset controls: **Points 歸零**, **Subscribe 歸零**, and **全部歸零**. Resetting deletes the matching `gifts` documents in batches, immediately returns the totals and ranks to zero on every connected device, and writes an owner-only audit entry under `rankResets` containing the reset type, deleted count, UID, email, and server timestamp. Reset does not refund previously spent Points and does not cancel an active subscription.

## Test points versus production payments

The included rules intentionally allow authenticated users to add only one of the five configured test packs to their own test wallet. This is suitable for UI testing, not real money.

Before accepting real payments:

1. Remove the client-side test top-up permission from `firestore.rules`.
2. Create the payment session on a trusted backend.
3. Verify Stripe/Google Play/other provider webhooks on the backend.
4. Add Points with Firebase Admin SDK or a trusted Cloud Function.
5. Use an atomic backend transaction to deduct Points and create the gift ledger entry.

Never trust a price, Points amount, subscription status, or payment result supplied by browser JavaScript.
