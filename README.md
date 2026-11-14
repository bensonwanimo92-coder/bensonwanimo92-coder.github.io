# SkyNest Property Network

A responsive GitHub Pages front-end for a Kenyan property discovery and advertising network.

## Website pages
- `index.html`: public discovery and advertiser information page.
- `advertiser.html`: advertiser workspace and listing-submission experience preview.
- `styles.css`, `app.js`: public website styling and interactions.
- `dashboard.css`, `dashboard.js`: advertiser workspace styling and preview interaction.

## Current implementation status
This is still a front-end preview. The dashboard form generates an on-screen preview only; it does not save or publish listings. Public sample property cards are clearly labelled as illustrative. Advertiser authentication, a cloud database, image storage, moderation, payment checkout, notifications and Android integration are not yet connected.

## Backend activation required
The Android app currently uses Firebase Auth and Cloud Firestore. To share a single property inventory safely between the website and app, configure a Firebase Web App in the same Firebase project, provide its public web config, confirm Email/Password sign-in is enabled, and review/deploy dedicated listing security rules. Public listing reads must expose only approved/published listing fields; landlord/tenant records and payment data must remain private.

## Planned listing lifecycle
Advertiser account → listing draft → submit for review → admin approval → public website + tenant discovery → expiry/availability update.

Never put Firebase service-account keys, admin SDK credentials or other private secrets in this public repository.
