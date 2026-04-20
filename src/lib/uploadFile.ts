import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
 
// ── Constants you can tune ────────────────────────────────────────────────────
const MAX_DIMENSION  = 800; 
const JPEG_QUALITY   = 0.82; 
const MAX_BASE64_KB  = 500;   
 
// ── Types ─────────────────────────────────────────────────────────────────────
export interface UploadResult {
  /** Value to store in the Firestore `text` field (URL or FILE:: string). */
  firestoreText: string;
  /** Human-readable preview for the chat's lastMessage field. */
  preview: string;
  /** True if content was uploaded to Firebase Storage. */
  usedStorage: boolean;
}
 
export type ProgressCallback = (percent: number) => void;

// compressImage
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
 
    img.onload = () => {
      URL.revokeObjectURL(url);
 
      let { width, height } = img;
 
      // Downscale only — never upscale
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
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Only use the compressed version if it's actually smaller
          resolve(blob.size < file.size ? blob : file);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
 
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// uploadToStorage
export function uploadToStorage(
  blob:       Blob | File,
  chatId:     string,
  fileName:   string,
  onProgress: ProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storage  = getStorage();
    const path     = `chats/${chatId}/${Date.now()}_${fileName}`;
    const fileRef  = storageRef(storage, path);
    const task     = uploadBytesResumable(fileRef, blob);
 
    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(pct);
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
 
// ─────────────────────────────────────────────────────────────────────────────
// blobToBase64
//
// Fallback: converts a Blob to a base64 data URL for Firestore storage.
// ─────────────────────────────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
 
export async function uploadFile(
  file:       File,
  chatId:     string,
  onProgress: ProgressCallback
): Promise<UploadResult> {
  const isImage = file.type.startsWith("image/");
  const isAudio = file.type.startsWith("audio/");
  const isPdf   = file.type === "application/pdf";
 
  let uploadBlob: Blob = file;
  let uploadName: string = file.name;
  let compressionRatio = 1;
 
  if (isImage) {
    try {
      const compressed = await compressImage(file);
      compressionRatio = compressed.size / file.size;
      uploadBlob = compressed;
      uploadName = file.name.replace(/\.[^.]+$/, "") + ".jpg"; // normalise extension
      console.log(
        `[upload] Image compressed: ${(file.size / 1024).toFixed(0)} KB → ` +
        `${(compressed.size / 1024).toFixed(0)} KB ` +
        `(${(compressionRatio * 100).toFixed(0)} %)`
      );
    } catch (err) {
      console.warn("[upload] Compression failed, using original:", err);
    }
  }
 
  try {
    const downloadUrl = await uploadToStorage(uploadBlob, chatId, uploadName, onProgress);
 
    if (isImage) {
      // ChatBubble already treats any https:// string as an image (line 42)
      return {
        firestoreText: downloadUrl,
        preview:       "📷 Photo",
        usedStorage:   true,
      };
    }
 
    if (isAudio) {
      return {
        firestoreText: `FILE::Audio Note::${downloadUrl}`,
        preview:       "🎤 Audio Note",
        usedStorage:   true,
      };
    }
 
    return {
      firestoreText: `FILE::${file.name}::${downloadUrl}`,
      preview:       isPdf ? "📄 PDF" : `📄 ${file.name}`,
      usedStorage:   true,
    };
  } catch (storageErr) {
    console.warn(
      "[upload] Firebase Storage failed, falling back to base64:",
      storageErr
    );
 
    if (uploadBlob.size / 1024 > MAX_BASE64_KB) {
      console.warn(
        `[upload] ⚠️  Storing ${(uploadBlob.size / 1024).toFixed(0)} KB as base64 in Firestore. ` +
        "Large files may exceed the 1 MB document limit. Configure Firebase Storage to fix this."
      );
    }
    
    onProgress(50);
    const base64 = await blobToBase64(uploadBlob);
    onProgress(100);
 
    if (isImage) {
      return { firestoreText: base64,                          preview: "📷 Photo",       usedStorage: false };
    }
    if (isAudio) {
      return { firestoreText: `FILE::Audio Note::${base64}`,  preview: "🎤 Audio Note",  usedStorage: false };
    }
    return {
      firestoreText: `FILE::${file.name}::${base64}`,
      preview:       isPdf ? "📄 PDF" : `📄 ${file.name}`,
      usedStorage:   false,
    };
  }
}
