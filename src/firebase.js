import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile, signOut,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClhi6tb_i3tO0LRcL_iG9_28kt6CcbYsY",
  authDomain: "fire-8e7b4.firebaseapp.com",
  projectId: "fire-8e7b4",
  storageBucket: "fire-8e7b4.firebasestorage.app",
  messagingSenderId: "507348310108",
  appId: "1:507348310108:web:992284a9ddc4c4865e2e99",
  databaseURL: "https://fire-8e7b4-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const rtdb = db; // 與既有 services 相容
export const firestore = getFirestore(app);

/** 監聽登入狀態 */
export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

/** 以 Email/密碼 註冊，並寫入暱稱 */
export async function signUpEmail(email, password, nickname) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (nickname) await updateProfile(cred.user, { displayName: nickname });
  return cred.user;
}

/** 以 Email/密碼 登入 */
export async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** 訪客登入（匿名，不記排行） */
export async function signInGuest() {
  const cred = await signInAnonymously(auth);
  await updateProfile(cred.user, { displayName: '訪客騎士' });
  return cred.user;
}

export function logOut() {
  return signOut(auth);
}

export default app;
