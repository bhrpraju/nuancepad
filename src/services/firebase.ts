import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { env, isFirebaseConfigured } from "../config/env";

let appInitialized = false;

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId
};

export const firebaseState = {
  configured: isFirebaseConfigured(),
  app: undefined as ReturnType<typeof initializeApp> | undefined,
  auth: undefined as ReturnType<typeof getAuth> | undefined,
  db: undefined as ReturnType<typeof getFirestore> | undefined
};

export const initFirebase = () => {
  if (!firebaseState.configured || appInitialized) {
    return firebaseState;
  }

  const app = initializeApp(firebaseConfig);
  firebaseState.app = app;
  firebaseState.auth = getAuth(app);
  firebaseState.db = getFirestore(app);
  appInitialized = true;

  return firebaseState;
};
