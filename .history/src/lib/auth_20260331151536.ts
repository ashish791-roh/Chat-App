import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

const formatUser = (firebaseUser: FirebaseUser): AppUser => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || "Unknown",
  email: firebaseUser.email || "",
  avatar: firebaseUser.photoURL || "",
  bio: "",
});

export const signup = async (name: string, email: string, password: string): Promise<AppUser> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email,
    avatar: "",
    bio: "",
    isOnline: true,
    createdAt: serverTimestamp(),
  });
  return formatUser(user);
};

// --- CRITICAL: Complete Update Function ---
export const updateUserProfile = async (uid: string, data: { name?: string; avatar?: string; bio?: string }) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found");

  // 1. Update Firebase Auth Session
  await updateProfile(user, {
    displayName: data.name || user.displayName,
    photoURL: data.avatar || user.photoURL
  });

  // 2. Update Firestore
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });

  // 3. Sync LocalStorage for the home page useEffect
  const stored = localStorage.getItem("blinkchat_user");
  if (stored) {
    const parsed = JSON.parse(stored);
    localStorage.setItem("blinkchat_user", JSON.stringify({
      ...parsed,
      displayName: data.name || parsed.displayName,
      photoURL: data.avatar || parsed.photoURL,
      bio: data.bio || parsed.bio
    }));
  }
};

export const login = async (email: string, password: string): Promise<AppUser> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return formatUser(user);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthState = (callback: (user: AppUser | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? formatUser(firebaseUser) : null);
  });
};