export const updateUserProfile = async (
  uid: string,
  data: { name?: string; avatar?: string; bio?: string }
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found");

  // 1. Update Firebase Auth (Session Data)
  await updateProfile(user, {
    displayName: data.name || user.displayName,
    photoURL: data.avatar || user.photoURL,
  });

  // 2. Update Firestore (SAFE: create if not exists)
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true } // ✅ THIS FIXES YOUR ERROR
  );

  // 3. Update Local Storage (Immediate UI Sync)
  const stored = localStorage.getItem("blinkchat_user");
  if (stored) {
    const parsed = JSON.parse(stored);
    localStorage.setItem(
      "blinkchat_user",
      JSON.stringify({
        ...parsed,
        displayName: data.name || parsed.displayName,
        photoURL: data.avatar || parsed.photoURL,
        bio: data.bio || parsed.bio,
      })
    );
  }
};