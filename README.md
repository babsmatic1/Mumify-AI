# Mumify AI

Budget-smart meal planner for busy mothers and pregnant women. Scan your fridge, plan your week, and get tailored nutritional advice.

## Prerequisites

- Node.js

## Setup

### 1. Install dependencies

```
npm install
```

### 2. Get a Gemini API key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), create a key, and copy it (it looks like `AIzaSy...`).

### 3. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a new project (the free Spark plan works).
2. In **Build > Authentication > Sign-in method**, enable **Email/Password** and **Google**.
3. In **Build > Firestore Database**, click **Create database** and start in production mode (default database, any region).
4. In **Project settings > General > Your apps**, add a **Web app** and copy the config values shown (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
5. In **Firestore Database > Rules**, paste the contents of [firestore.rules](firestore.rules) from this repo and publish.
6. If you plan to deploy the built app somewhere other than `localhost`, add that domain under **Authentication > Settings > Authorized domains**.

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in the values from steps 2 and 3:

```
VITE_GEMINI_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 5. Run the app

```
npm run dev
```
