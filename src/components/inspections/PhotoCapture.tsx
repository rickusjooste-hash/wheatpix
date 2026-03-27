"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/image-compress";
import type { PendingPhoto } from "@/lib/inspection-utils";

interface PhotoCaptureProps {
  photos: PendingPhoto[];
  onAdd: (photo: PendingPhoto) => void;
  onRemove: (photoId: string) => void;
  onCaptionChange: (photoId: string, caption: string) => void;
  maxPhotos?: number;
}

export default function PhotoCapture({
  photos,
  onAdd,
  onRemove,
  onCaptionChange,
  maxPhotos = 3,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const blob = await compressImage(file);
      onAdd({
        id: crypto.randomUUID(),
        blob,
        caption: "",
        sort_order: photos.length,
      });
    } finally {
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const atMax = photos.length >= maxPhotos;

  return (
    <div style={{ padding: "12px 20px 0" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#555555",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "8px",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
        }}
      >
        Fotos ({photos.length}/{maxPhotos})
      </div>

      {photos.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingBottom: "8px",
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                flexShrink: 0,
                width: "120px",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={URL.createObjectURL(photo.blob)}
                  alt=""
                  style={{
                    width: "120px",
                    height: "90px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid #333333",
                    display: "block",
                  }}
                />
                <button
                  onClick={() => onRemove(photo.id)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid #555555",
                    color: "#cccccc",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Byskrif..."
                value={photo.caption}
                onChange={(e) => onCaptionChange(photo.id, e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px 8px",
                  background: "#1a1a1a",
                  border: "1px solid #222222",
                  borderRadius: "6px",
                  color: "#cccccc",
                  fontSize: "11px",
                  fontFamily: "var(--font-outfit), 'Outfit', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={atMax || compressing}
        style={{
          padding: "10px 16px",
          background: atMax ? "#1a1a1a" : "#111111",
          border: `1px solid ${atMax ? "#1a1a1a" : "#333333"}`,
          borderRadius: "8px",
          color: atMax ? "#333333" : "#888888",
          fontSize: "13px",
          fontWeight: 600,
          cursor: atMax ? "default" : "pointer",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          width: "100%",
        }}
      >
        {compressing ? "Kompresseer..." : "📷 Foto"}
      </button>
    </div>
  );
}
