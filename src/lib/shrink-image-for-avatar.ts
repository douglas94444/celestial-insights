const MAX_EDGE_PX = 512;
const TARGET_QUALITY = 0.88;

/**
 * Reduz foto de avatar para exibição em ~40–80px: menos bytes no Storage e decode mais rápido.
 * GIF mantém-se sem redimensionar (animação).
 */
export async function shrinkImageForAvatar(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        resolve(file);
        return;
      }
      const scale = Math.min(MAX_EDGE_PX / w, MAX_EDGE_PX / h, 1);
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);
      if (scale >= 1 && file.size < 400_000) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        TARGET_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
