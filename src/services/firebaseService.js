import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseAuthSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
  !firebaseConfig.projectId.includes('YOUR_PROJECT_ID')
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = app ? getAuth(app) : null;
export const firebaseDb = app
  ? initializeFirestore(app, { localCache: persistentLocalCache() })
  : null;

function requireFirebase() {
  if (!firebaseAuth || !firebaseDb) {
    throw new Error('Firebase 尚未設定。請檢查 .env 的 Firebase 配置。');
  }
}

function normalizeUser(user) {
  return user ? { id: user.uid, email: user.email, provider: 'firebase' } : null;
}

export async function firebaseGetCurrentUser() {
  requireFirebase();
  if (firebaseAuth.currentUser) return normalizeUser(firebaseAuth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(normalizeUser(user));
    });
  });
}

export async function firebaseSignUp(email, password) {
  requireFirebase();
  const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  return normalizeUser(result.user);
}

export async function firebaseSignIn(email, password) {
  requireFirebase();
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return normalizeUser(result.user);
}

export async function firebaseSignOut() {
  requireFirebase();
  await firebaseAuthSignOut(firebaseAuth);
}

export async function firebaseLoadProgress() {
  requireFirebase();
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  const ref = doc(firebaseDb, 'users', user.uid, 'private', 'progress');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data || {} : {};
}

export async function firebaseSaveProgress(progress) {
  requireFirebase();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('請先登入才能同步進度。');
  const ref = doc(firebaseDb, 'users', user.uid, 'private', 'progress');
  await setDoc(ref, { data: progress, updatedAt: serverTimestamp() }, { merge: true });
  return progress;
}
