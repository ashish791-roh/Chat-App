import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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

export const signup = async (
  name: string,
  email: string,
  password: string
): Promise<AppUser> => {
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

export const login = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return formatUser(user);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
};

export const subscribeToAuthState = (
  callback: (user: AppUser | null) => void
) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? formatUser(firebaseUser) : null);
  });
};
