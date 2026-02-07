import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0] as ReturnType<typeof initializeApp>;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;
  if (!serviceAccount) {
    console.warn("FIREBASE_SERVICE_ACCOUNT not set - Admin SDK will not work");
    return null;
  }
  return initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
  });
}

const adminApp = getAdminApp();
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;
