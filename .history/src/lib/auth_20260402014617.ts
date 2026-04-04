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
} from "firebase/firestore";

import { auth, db } from "./firebase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

// 🔹 Format Firebase user → App user
const formatUser = (firebaseUser: FirebaseUser): AppUser => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || "Unknown",
  email: firebaseUser.email || "",
  avatar: firebaseUser.photoURL || "",
  bio: "",
});

// ================= SIGNUP =================
export const signup = async (
  name: string,
  email: string,
  password: string
): Promise<AppUser> => {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Update Firebase Auth profile
  await updateProfile(user, { displayName: name });

  // Create Firestore user
  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name,
    email,
    avatar: "",
    bio: "",
    isOnline: true,
    createdAt: serverTimestamp(),
  });

  // Save to localStorage
  localStorage.setItem(
    "blinkchat_user",
    JSON.stringify(formatUser(user))
  );

  return formatUser(user);
};

// ================= LOGIN =================
export const login = async (
  email: string,
  password: string
): Promise<AppUser> => {
  const { user } = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const formatted = formatUser(user);

  // Save to localStorage
  localStorage.setItem("blinkchat_user", JSON.stringify(formatted));

  return formatted;
};

// ================= LOGOUT =================
export const logout = async (): Promise<void> => {
  localStorage.removeItem("blinkchat_user");
  await signOut(auth);
};

// ================= GET USER =================
export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
};

// ================= UPDATE PROFILE =================
export const updateUserProfile = async (
  uid: string,
  data: { name?: string; avatar?: string; bio?: string }
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found");

  // 🔥 FIX: prevent long photoURL crash
  const safePhotoURL =
    data.avatar && data.avatar.length < 1000
      ? data.avatar
      : user.photoURL;

  // 1️⃣ Update Firebase Auth (SAFE)
  await updateProfile(user, {
    displayName: data.name || user.displayName,
    photoURL: safePhotoURL || null,
  });

  // 2️⃣ Update Firestore (MERGE SAFE)
  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      ...(data.name && { name: data.name }),
      ...(data.avatar && { avatar: data.avatar }), // full image allowed here
      ...(data.bio && { bio: data.bio }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 3️⃣ Update localStorage (UI sync)
  const stored = localStorage.getItem("blinkchat_user");

  if (stored) {
    const parsed = JSON.parse(stored);

    localStorage.setItem(
      "blinkchat_user",
      JSON.stringify({
        ...parsed,
        name: data.name || parsed.name,
        avatar: data.avatar || parsed.avatar,
        bio: data.bio || parsed.bio,
      })
    );
  }
};

// ================= AUTH STATE =================


export const subscribeToAuthState = (
  callback: (user: AppUser | null) => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userRef = doc(db, "users", firebaseUser.uid);

      // 🟢 Set user ONLINE
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