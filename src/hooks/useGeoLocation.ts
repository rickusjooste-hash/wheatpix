"use client";

import { useState, useEffect, useCallback } from "react";
import { Block, findBlockByLocation } from "@/lib/inspection-utils";

export type GpsStatus = "unavailable" | "searching" | "locked" | "error";

interface GeoLocationState {
  status: GpsStatus;
  position: { lat: number; lng: number } | null;
  matchedBlock: Block | null;
  error: string | null;
}

export function useGeoLocation(blocks: Block[]) {
  const [state, setState] = useState<GeoLocationState>({
    status: "searching",
    position: null,
    matchedBlock: null,
    error: null,
  });

  const matchBlock = useCallback(
    (lat: number, lng: number) => {
      const point = { lat, lng };
      const matched = findBlockByLocation(point, blocks);
      setState((prev) => ({
        ...prev,
        status: "locked",
        position: point,
        matchedBlock: matched,
      }));
    },
    [blocks]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: "unavailable",
        error: "Geolocation not supported",
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: "searching" }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        matchBlock(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [matchBlock]);

  return state;
}
