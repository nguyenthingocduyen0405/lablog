"use client";

import { createClient } from "./supabase/client";

const LAB_MAP_BUCKET = "lab-assets";
const LAB_MAP_MAX_BYTES = 10 * 1024 * 1024;
const LAB_MAP_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const LAB_MAP_EXTENSIONS: Record<(typeof LAB_MAP_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type LabMapUpload = {
  path: string;
  publicUrl: string;
};

export function labMapFileError(file: Pick<File, "size" | "type">) {
  if (!LAB_MAP_TYPES.includes(file.type as (typeof LAB_MAP_TYPES)[number])) {
    return "type" as const;
  }
  if (file.size <= 0 || file.size > LAB_MAP_MAX_BYTES) {
    return "size" as const;
  }
  return null;
}

export async function uploadLabMapFile(
  labId: string,
  file: File,
): Promise<LabMapUpload> {
  const issue = labMapFileError(file);
  if (issue) throw new Error(`Invalid lab map ${issue}`);

  const extension =
    LAB_MAP_EXTENSIONS[file.type as (typeof LAB_MAP_TYPES)[number]];
  const path = `${labId}/maps/${crypto.randomUUID()}.${extension}`;
  const supabase = createClient();
  const upload = await supabase.storage.from(LAB_MAP_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data } = supabase.storage
    .from(LAB_MAP_BUCKET)
    .getPublicUrl(upload.data.path);
  return { path: upload.data.path, publicUrl: data.publicUrl };
}

export function labMapStoragePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl, "https://lablog.local");
    const marker = `/storage/v1/object/public/${LAB_MAP_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length),
    );
  } catch {
    return null;
  }
}

export async function removeLabMapFile(path: string) {
  const supabase = createClient();
  const result = await supabase.storage.from(LAB_MAP_BUCKET).remove([path]);
  if (result.error) throw result.error;
}
