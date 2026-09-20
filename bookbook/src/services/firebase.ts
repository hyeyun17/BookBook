import { initializeApp } from 'firebase/app'
import { deleteUser, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const firebaseConfigured = Object.values(config).every(Boolean)
const app = firebaseConfigured ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase 연결 설정이 필요합니다.')
  await signInWithPopup(auth, new GoogleAuthProvider())
}
export async function logout() {
  if (auth) await signOut(auth)
}

export async function deleteAccount() {
  if (!auth?.currentUser) throw new Error('로그인 상태를 확인해 주세요.')
  await deleteUser(auth.currentUser)
}
