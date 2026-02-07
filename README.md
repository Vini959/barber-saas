# Barber SaaS

Multi-tenant barbershop booking app with Firebase.

## Roles

- **platform_admin** – Creates barbershops, manages everything
- **shop_admin** – Manages one barbershop (barbers, services)
- **barber** – Views and confirms appointments
- **client** – Books appointments

## Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Copy `.env.example` to `.env.local` and fill in your Firebase config
5. For creating barbers: add Firebase Service Account JSON as `FIREBASE_SERVICE_ACCOUNT` (stringified)

### Create first platform_admin

1. Register a new user via `/register`
2. In Firebase Console > Firestore, edit `users/{your-uid}` and set `role: "platform_admin"`

### Create shop_admin

1. In Firestore, edit a user and set `role: "shop_admin"` and `shopId: "{barbershop-doc-id}"`

## Firestore rules

Deploy rules from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

## Run

```bash
npm install
npm run dev
```

## Features

- [x] Auth (login/register)
- [x] Platform admin: create barbershops
- [x] Shop admin: add barbers (via API with Admin SDK)
- [x] Client: book appointment (shop → barber → date/time)
- [x] Client: view my appointments
- [x] Barber: view schedule, confirm/cancel appointments
