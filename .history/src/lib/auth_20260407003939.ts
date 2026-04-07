import { collection, query, where, getDocs } from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  get
} from "firebase/firestore";

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

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const q = query(
    collection(db, "users"),
    where("username", "==", username.toLowerCase().trim())
  );
  const snap = await getDocs(q);
  return snap.empty;
};

export const signup = async (
  name: string,
  email: string,
  password: string,
  username: string          // ← add param
): Promise<AppUser> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email,
    username: username.toLowerCase().trim(),   // ← save it
    avatar: "",
    bio: "",
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return formatUser(user);
};

export const login = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // 🟢 Mark online
  await updateDoc(doc(db, "users", user.uid), {
    isOnline: true,
    lastSeen: serverTimestamp(),
  });

  localStorage.setItem("blinkchat_user", JSON.stringify(formatUser(user)));

  return formatUser(user);
};

export const logout = async (): Promise<void> => {
  const user = auth.currentUser;

  if (user) {
    await updateDoc(doc(db, "users", user.uid), {
      isOnline: false,
      lastSeen: serverTimestamp(),
    });
  }

  localStorage.removeItem("blinkchat_user");
  await signOut(auth);
};

// ✅ FIXED: Safe profile update (with avatar limit protection)
export const updateUserProfile = async (
  uid: string,
  data: { name?: string; avatar?: string; bio?: string }
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found");

  const safeAvatar =
    data.avatar && data.avatar.length < 1000 ? data.avatar : undefined;

  await updateProfile(user, {
    displayName: data.name || user.displayName,
    photoURL: safeAvatar || user.photoURL,
  });

  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      ...data,
      avatar: safeAvatar || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const stored = localStorage.getItem("blinkchat_user");
  if (stored) {
    const parsed = JSON.parse(stored);
    localStorage.setItem(
      "blinkchat_user",
      JSON.stringify({
        ...parsed,
        name: data.name || parsed.name,
        avatar: safeAvatar || parsed.avatar,
        bio: data.bio || parsed.bio,
      })
    );
  }
};

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
};

// ✅ UPDATED: Auth + online sync
export const subscribeToAuthState = (
  callback: (user: AppUser | null) => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userRef = doc(db, "users", firebaseUser.uid);

      await setDoc(
        userRef,
        {
          isOnline: true,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      callback(formatUser(firebaseUser));
    } else {
      callback(null);
    }
  });
};

// ✅ NEW: Real-time user status listener
export const subscribeToUserStatus = (
  uid: string,
  callback: (data: any) => void
) => {
  const ref = doc(db, "users", uid);

  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
};