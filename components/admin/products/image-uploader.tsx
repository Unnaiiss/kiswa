"use client";

import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Link as LinkIcon, Loader2, X } from "lucide-react";
import { auth } from "@/lib/firebase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1600;

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error: string | null;
}

interface ImageUploaderProps {
  images: string[];
  onChange: (next: string[]) => void;
  /** Where each file is POSTed (FormData field "image"), one request per
   * file — lets each thumbnail show its own progress/error independently.
   * A prop rather than a hardcoded path so other admin image galleries
   * could reuse this same component against their own endpoint. */
  uploadEndpoint: string;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

/** Downscales to at most MAX_DIMENSION on the long edge (never upscales),
 * so the storefront doesn't ship full-resolution supplier photos. PNGs stay
 * PNG (may be a deliberate cutout with transparency); everything else
 * re-encodes as JPEG, which every browser's canvas can produce reliably
 * (unlike WEBP encoding, which isn't universally supported). */
function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const longEdge = Math.max(width, height);
      if (longEdge > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / longEdge;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
        outputType,
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

function uploadWithProgress(
  endpoint: string,
  blob: Blob,
  filename: string,
  idToken: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response — data stays {}, handled below as a failure.
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve(data.url);
      } else {
        reject(new Error(data.error ?? "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    const formData = new FormData();
    formData.set("image", blob, filename);
    xhr.send(formData);
  });
}

export function ImageUploader({ images, onChange, uploadEndpoint }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragImageIdx, setDragImageIdx] = useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    // Accumulate locally rather than relying on the `images` prop, which
    // won't reflect earlier files in this same batch until the parent
    // re-renders — without this, sequential onChange calls would each
    // overwrite instead of append.
    let current = [...images];

    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploading((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, error: "Only JPG, PNG, or WEBP images are allowed" },
        ]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploading((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, error: "Image must be 5MB or smaller" },
        ]);
        continue;
      }

      setUploading((prev) => [...prev, { id, name: file.name, progress: 0, error: null }]);
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("Your session expired. Please sign in again.");

        const resized = await resizeImage(file);
        const url = await uploadWithProgress(uploadEndpoint, resized, file.name, idToken, (pct) => {
          setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
        });

        current = [...current, url];
        onChange(current);
        setUploading((prev) => prev.filter((u) => u.id !== id));
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, error: err instanceof Error ? err.message : "Upload failed" }
              : u,
          ),
        );
      }
    }
  }

  function handleReorderOver(overIdx: number) {
    if (dragImageIdx === null || dragImageIdx === overIdx) return;
    const next = [...images];
    const [moved] = next.splice(dragImageIdx, 1);
    next.splice(overIdx, 0, moved);
    onChange(next);
    setDragImageIdx(overIdx);
  }

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function addUrl() {
    const trimmed = urlValue.trim();
    if (trimmed) onChange([...images, trimmed]);
    setUrlValue("");
    setShowUrlInput(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              draggable
              onDragStart={() => setDragImageIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                handleReorderOver(idx);
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => setDragImageIdx(null)}
              className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border transition-opacity active:cursor-grabbing ${
                dragImageIdx === idx ? "opacity-50" : "border-zinc-800"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
                  Primary
                </span>
              )}
              <span className="absolute bottom-1 left-1 text-zinc-100/90 drop-shadow">
                <GripVertical size={14} />
              </span>
              <button
                type="button"
                onClick={() => removeImage(idx)}
                aria-label="Remove image"
                className="absolute right-1 top-1 cursor-pointer rounded-full bg-zinc-950/80 p-1 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? "border-amber-400 bg-amber-400/5" : "border-zinc-800 hover:border-zinc-700"
        }`}
      >
        <ImagePlus size={22} className="text-zinc-500" />
        <p className="text-sm text-zinc-300">
          <span className="text-amber-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-zinc-500">
          JPG, PNG or WEBP · Up to 5MB · Square, at least 1000×1000px recommended
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploading.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {uploading.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
            >
              {u.error ? (
                <>
                  <span className="flex-1 truncate text-red-400">
                    {u.name}: {u.error}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploading((prev) => prev.filter((x) => x.id !== u.id))}
                    aria-label="Dismiss"
                    className="shrink-0 cursor-pointer text-zinc-500 hover:text-zinc-300"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Loader2 size={14} className="shrink-0 animate-spin text-amber-400" />
                  <span className="flex-1 truncate text-zinc-300">{u.name}</span>
                  <span className="shrink-0 text-zinc-500">{u.progress}%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showUrlInput ? (
        <div className="flex gap-2">
          <input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://…"
            className={inputClass}
            autoFocus
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!urlValue.trim()}
            className="cursor-pointer rounded-lg border border-zinc-700 px-4 text-sm text-zinc-300 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(false);
              setUrlValue("");
            }}
            className="cursor-pointer rounded-lg border border-zinc-800 px-3 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          <LinkIcon size={12} /> or paste an image URL
        </button>
      )}
    </div>
  );
}
