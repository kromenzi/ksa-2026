import { apiRequest } from "@/lib/queryClient";

export const MAX_HSE_IMAGES = 4;
export const MAX_HSE_IMAGE_BYTES = 10 * 1024 * 1024;

export type HseImageScope = "ncr" | "violation" | "monthly-task";

export interface HseStoredImage {
  path: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export const isHseStoragePath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("hse-images/");

export const getStoredImagePath = (value: unknown): string => {
  if (isHseStoragePath(value)) return value;
  if (value && typeof value === "object" && isHseStoragePath((value as HseStoredImage).path)) {
    return (value as HseStoredImage).path;
  }
  return "";
};

async function storageAction(action: string, payload: Record<string, unknown>) {
  const response = await apiRequest(
    "POST",
    `/api/system-health?resource=document-storage&action=${encodeURIComponent(action)}`,
    payload,
  );
  return response.json();
}

export async function uploadHseImages(files: File[], scope: HseImageScope): Promise<HseStoredImage[]> {
  if (files.length > MAX_HSE_IMAGES) throw new Error(`Maximum ${MAX_HSE_IMAGES} images allowed`);
  const uploaded: HseStoredImage[] = [];
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error(`${file.name}: image files only`);
      if (file.size <= 0 || file.size > MAX_HSE_IMAGE_BYTES) throw new Error(`${file.name}: maximum image size is 10MB`);

      const sign = await storageAction("sign-image-upload", {
        scope,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      const path = String(sign?.path || "");
      const signedUrl = String(sign?.signedUrl || "");
      if (!path || !signedUrl) throw new Error(`Unable to prepare upload for ${file.name}`);

      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", file);
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadBody,
      });
      if (!uploadResponse.ok) {
        const message = await uploadResponse.text().catch(() => "");
        throw new Error(message || `Unable to upload ${file.name}`);
      }

      uploaded.push({
        path,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await deleteHseImages(uploaded).catch(() => undefined);
    throw error;
  }
}

export async function resolveHseImageUrls(values: unknown[]): Promise<string[]> {
  const resolved = await Promise.all(values.slice(0, MAX_HSE_IMAGES).map(async (value) => {
    const path = getStoredImagePath(value);
    if (path) {
      try {
        const data = await storageAction("sign-read", { path });
        return String(data?.signedUrl || "");
      } catch {
        return "";
      }
    }
    if (typeof value === "string" && /^(https?:|data:|blob:)/i.test(value)) return value;
    return "";
  }));
  return resolved.filter(Boolean);
}

export async function deleteHseImages(values: unknown[]): Promise<void> {
  const paths = values.map(getStoredImagePath).filter(Boolean);
  await Promise.allSettled(paths.map((path) => storageAction("delete-hse-image", { path })));
}
