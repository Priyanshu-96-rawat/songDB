import 'server-only';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    : undefined,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            }),
        });
    } catch {
        // Firebase admin initialization failed
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
