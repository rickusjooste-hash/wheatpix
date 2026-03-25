"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WeedSeverityEntry } from "@/lib/inspection-utils";

const DB_NAME = "kamp-inspeksie-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_inspections";

export type OnlineStatus = "online" | "offline";

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
  created_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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
        const { weeds, ...inspectionData } = item;

        const { data: inserted, error: insertError } = await supabase
          .from("camp_inspections" as never)
          .insert(inspectionData as never)
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            await removePending(item.id);
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
          }));

          const { error: weedError } = await supabase
            .from("camp_inspection_weeds" as never)
            .insert(weedRows as never);

          if (weedError) {
            console.error("Weed sync error:", weedError);
            continue;
          }
        }

        await removePending(item.id);
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
    async (inspection: Omit<PendingInspection, "created_at">) => {
      const pending: PendingInspection = {
        ...inspection,
        created_at: new Date().toISOString(),
      };

      await addPending(pending);
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
