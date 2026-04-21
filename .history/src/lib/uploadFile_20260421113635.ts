import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_DIMENSION  = 1200;   // px
const JPEG_QUALITY   = 0.85;
const MAX_BASE64_KB  = 500;
const STALL_CHECK_MS = 10_000; // check every 10s, abort after 3 consecutive stalls

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UploadResult {
  firestoreText: string;
  preview:       string;
  usedStorage:   boolean;
}

export type ProgressCallback = (percent: number) => void;

// ── compressImage ─────────────────────────────────────────────────────────────
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width  = MAX_DIMENSION;
        } else {
          width  = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { if (!blob) { resolve(file); return; } resolve(blob.size < file.size ? blob : file); },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ── uploadToStorage ───────────────────────────────────────────────────────────
export function uploadToStorage(
  blob:       Blob | File,
  chatId:     string,
  fileName:   string,
  onProgress: ProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storage = getStorage();
    const path    = `chats/${chatId}/${Date.now()}_${fileName}`;
    const fileRef = storageRef(storage, path);
    const task    = uploadBytesResumable(fileRef, blob);

    // Stall detection — cancel if no bytes are transferred for 30 s
    let lastBytes  = -1;
    let stallCount = 0;
    const stallInterval = setInterval(() => {
      const current = task.snapshot.bytesTransferred;
      if (current === lastBytes) {
        if (++stallCount >= 3) {
          clearInterval(stallInterval);
          task.cancel();
          reject(new Error(
            "Upload stalled. Check: (1) Firebase Storage is enabled, " +
            "(2) Storage rules allow writes, (3) storageBucket env var is set."
          ));
        }
      } else {
        stallCount = 0;
        lastBytes  = current;
      }
    }, STALL_CHECK_MS);

    task.on(
      "state_changed",
      (snap) => {
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        clearInterval(stallInterval);
        if ((err as any).code === "storage/unauthorized") {
          console.error(
            "[upload] ❌ Firebase Storage PERMISSION DENIED.\n" +
            "Go to Firebase Console → Storage → Rules and set:\n" +
            "  allow read, write: if request.auth != null;"
          );
        } else {
          console.error("[upload] Storage error:", (err as any).code, err.message);
        }
        reject(err);
      },
      async () => {
        clearInterval(stallInterval);
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (e) { reject(e); }
      }
    );
  });
}

// ── blobToBase64 ──────────────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r    = new FileReader();
    r.onload   = () => resolve(r.result as string);
    r.onerror  = reject;
    r.readAsDataURL(blob);
  });
}

// ── uploadFile ────────────────────────────────────────────────────────────────
export async function uploadFile(
  file:       File,
  chatId:     string,
  onProgress: ProgressCallback
): Promise<UploadResult> {
  const isImage = file.type.startsWith("image/");
  const isAudio = file.type.startsWith("audio/");
  const isPdf   = file.type === "application/pdf";

  let uploadBlob: Blob   = file;
  let uploadName: string = file.name;

  if (isImage) {
    try {
      const compressed = await compressImage(file);
      uploadBlob = compressed;
      uploadName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      console.log(`[upload] Compressed: ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);
    } catch (err) {
      console.warn("[upload] Compression failed, using original:", err);
    }
  }

  // ── Try Firebase Storage ──────────────────────────────────────────────────
  try {
    const url = await uploadToStorage(uploadBlob, chatId, uploadName, onProgress);

    // Use explicit IMG:: prefix so ChatBubble can identify images unambiguously
    if (isImage) return { firestoreText: `IMG::${url}`,                  preview: "📷 Photo",      usedStorage: true };
    if (isAudio) return { firestoreText: `FILE::Audio Note::${url}`,     preview: "🎤 Audio Note", usedStorage: true };
    return          { firestoreText: `FILE::${file.name}::${url}`,       preview: isPdf ? "📄 PDF" : `📄 ${file.name}`, usedStorage: true };

  } catch (storageErr) {
    console.warn("[upload] Storage failed, trying base64 fallback:", (storageErr as Error).message);
  }

  // ── Base64 fallback ───────────────────────────────────────────────────────
  if (uploadBlob.size / 1024 > MAX_BASE64_KB) {
    throw new Error(
      `File is ${(uploadBlob.size/1024).toFixed(0)} KB — too large for base64 fallback.\n` +
      "Fix Firebase Storage security rules to enable direct uploads."
    );
  }

  onProgress(50);
  const base64 = await blobToBase64(uploadBlob);
  onProgress(100);

  if (isImage) return { firestoreText: `IMG::${base64}`,                 preview: "📷 Photo",      usedStorage: false };
  if (isAudio) return { firestoreText: `FILE::Audio Note::${base64}`,    preview: "🎤 Audio Note", usedStorage: false };
  return          { firestoreText: `FILE::${file.name}::${base64}`,      preview: isPdf ? "📄 PDF" : `📄 ${file.name}`, usedStorage: false };
}