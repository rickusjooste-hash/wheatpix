"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WeedSeverityEntry } from "@/lib/inspection-utils";

const DB_NAME = "kamp-inspeksie-offline";
const DB_VERSION = 2;
const STORE_NAME = "pending_inspections";
const PHOTO_STORE = "pending_photos";

export type OnlineStatus = "online" | "offline";

interface PendingPhotoMeta {
  id: string;
  caption: string;
  sort_order: number;
}

interface PendingInspection {
  id: string;
  farm_id: string;
  block_id: string;
  stage_id: string;
  inspector_id: string;
  inspection_date: string;
  gps_lat: number | null;
  gps_lng: number | null;
  crop: string | null;
  cultivar: string | null;
  notes: string | null;
  weeds: WeedSeverityEntry[];
  photos: PendingPhotoMeta[];
  created_at: string;
}

interface StoredPhotoBlob {
  id: string;
  inspectionId: string;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addPending(inspection: PendingInspection): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(inspection);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPending(): Promise<PendingInspection[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removePending(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function addPhotoBlob(photo: StoredPhotoBlob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPhotoBlobs(inspectionId: string): Promise<StoredPhotoBlob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readonly");
    const request = tx.objectStore(PHOTO_STORE).getAll();
    request.onsuccess = () => {
      const all = request.result as StoredPhotoBlob[];
      resolve(all.filter((p) => p.inspectionId === inspectionId));
    };
    request.onerror = () => reject(request.error);
  });
}

async function removePhotoBlobs(inspectionId: string): Promise<void> {
  const db = await openDB();
  const blobs = await getPhotoBlobs(inspectionId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_STORE);
    for (const b of blobs) {
      store.delete(b.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineSync() {
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus("online");
    const handleOffline = () => setOnlineStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getAllPending();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const syncToSupabase = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const supabase = createClient();
      const pending = await getAllPending();

      for (const item of pending) {
        const { weeds, photos, ...inspectionData } = item;

        const { data: inserted, error: insertError } = await supabase
          .from("camp_inspections" as never)
          .insert(inspectionData as never)
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            await removePending(item.id);
            await removePhotoBlobs(item.id);
            continue;
          }
          console.error("Sync error:", insertError);
          continue;
        }

        if (weeds.length > 0 && inserted) {
          const weedRows = weeds.map((w) => ({
            inspection_id: (inserted as { id: string }).id,
            weed_species_id: w.weed_species_id,
            severity: w.severity,
            notes: w.notes || null,
          }));

          const { error: weedError } = await supabase
            .from("camp_inspection_weeds" as never)
            .insert(weedRows as never);

          if (weedError) {
            console.error("Weed sync error:", weedError);
            continue;
          }
        }

        // Upload photos
        if (photos.length > 0 && inserted) {
          const inspectionId = (inserted as { id: string }).id;
          const blobs = await getPhotoBlobs(item.id);

          for (const photoMeta of photos) {
            const blob = blobs.find((b) => b.id === photoMeta.id);
            if (!blob) continue;

            const storagePath = `${item.farm_id}/${inspectionId}/${photoMeta.id}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from("inspection-photos")
              .upload(storagePath, blob.blob, {
                contentType: "image/jpeg",
                upsert: false,
              });

            if (uploadError) {
              console.error("Photo upload error:", uploadError);
              continue;
            }

            await supabase
              .from("camp_inspection_photos" as never)
              .insert({
                inspection_id: inspectionId,
                storage_path: storagePath,
                caption: photoMeta.caption || null,
                sort_order: photoMeta.sort_order,
              } as never);
          }
        }

        await removePending(item.id);
        await removePhotoBlobs(item.id);
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    if (onlineStatus === "online") {
      syncToSupabase();
    }
  }, [onlineStatus, syncToSupabase]);

  const saveInspection = useCallback(
    async (
      inspection: Omit<PendingInspection, "created_at">,
      photoBlobs?: { id: string; blob: Blob }[]
    ) => {
      const pending: PendingInspection = {
        ...inspection,
        created_at: new Date().toISOString(),
      };

      await addPending(pending);

      if (photoBlobs) {
        for (const pb of photoBlobs) {
          await addPhotoBlob({
            id: pb.id,
            inspectionId: inspection.id,
            blob: pb.blob,
          });
        }
      }

      await refreshPendingCount();

      if (navigator.onLine) {
        await syncToSupabase();
      }
    },
    [syncToSupabase, refreshPendingCount]
  );

  return {
    onlineStatus,
    pendingCount,
    syncing,
    saveInspection,
    syncToSupabase,
  };
}
