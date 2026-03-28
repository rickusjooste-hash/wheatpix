"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turfHelpers from "@turf/helpers";
import turfArea from "@turf/area";

interface Block {
  id: string;
  name: string;
  geometry: { lat: number; lng: number }[] | null;
  area_hectares: number | null;
  is_active: boolean;
  sort_order: number;
}

interface FarmMapProps {
  farmId: string;
  farmName: string;
  blocks: Block[];
  center?: [number, number];
  onBlockCreated: (name: string, geometry: { lat: number; lng: number }[], areaHa: number) => Promise<void>;
  onBlockUpdated: (blockId: string, geometry: { lat: number; lng: number }[], areaHa: number) => Promise<void>;
  onBlockSelected: (block: Block | null) => void;
  selectedBlockId: string | null;
}

function calcHectares(latlngs: L.LatLng[]): number {
  const coords = latlngs.map((ll) => [ll.lng, ll.lat] as [number, number]);
  coords.push(coords[0]); // close ring
  const polygon = turfHelpers.polygon([coords]);
  return turfArea(polygon) / 10000;
}

function geometryToLatLngs(geom: { lat: number; lng: number }[]): L.LatLng[] {
  return geom.map((p) => L.latLng(p.lat, p.lng));
}

function latLngsToGeometry(latlngs: L.LatLng[]): { lat: number; lng: number }[] {
  return latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
}

const BLOCK_COLORS = ["#4a9a4a", "#5a8a5a", "#6dbb6d", "#3a7a3a", "#2D5A1B"];

export default function FarmMap({
  farmId,
  farmName,
  blocks,
  center,
  onBlockCreated,
  onBlockUpdated,
  onBlockSelected,
  selectedBlockId,
}: FarmMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const blockLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Compute center from blocks if not provided
    let mapCenter: [number, number] = center || [-33.9, 18.9]; // Default: Western Cape
    let mapZoom = 14;

    if (!center && blocks.length > 0) {
      const allPoints = blocks.flatMap((b) => b.geometry || []);
      if (allPoints.length > 0) {
        const avgLat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
        const avgLng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;
        mapCenter = [avgLat, avgLng];
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: false,
    });

    // Satellite layer
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri",
        maxZoom: 19,
      }
    ).addTo(map);

    // Labels overlay
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        opacity: 0.7,
      }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#F5C842",
            weight: 2,
            fillOpacity: 0.2,
          },
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: false,
      },
    });
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Handle draw created
    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const layer = (e as L.DrawEvents.Created).layer as L.Polygon;
      const latlngs = (layer.getLatLngs()[0] as L.LatLng[]);
      const geometry = latLngsToGeometry(latlngs);
      const areaHa = calcHectares(latlngs);

      const name = prompt(`Kamp naam? (${areaHa.toFixed(1)} ha)`);
      if (name) {
        onBlockCreated(name, geometry, parseFloat(areaHa.toFixed(2)));
      }
      setIsDrawing(false);
    });

    map.on(L.Draw.Event.DRAWSTART, () => setIsDrawing(true));
    map.on(L.Draw.Event.DRAWSTOP, () => setIsDrawing(false));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render block polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    blockLayersRef.current.forEach((layer) => map.removeLayer(layer));
    blockLayersRef.current.clear();

    const bounds: L.LatLng[] = [];

    blocks.forEach((block, i) => {
      if (!block.geometry || block.geometry.length < 3) return;

      const latlngs = geometryToLatLngs(block.geometry);
      bounds.push(...latlngs);

      const isSelected = block.id === selectedBlockId;
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length];

      const polygon = L.polygon(latlngs, {
        color: isSelected ? "#F5C842" : color,
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.3 : 0.15,
      });

      // Label
      const center = polygon.getBounds().getCenter();
      const label = L.divIcon({
        className: "",
        html: `<div style="
          font-size: 11px;
          font-weight: 700;
          color: #F5EDDA;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          white-space: nowrap;
          font-family: 'JetBrains Mono', monospace;
          pointer-events: none;
        ">${block.name}${block.area_hectares ? ` · ${block.area_hectares.toFixed(1)}ha` : ""}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(center, { icon: label, interactive: false }).addTo(map);

      polygon.on("click", () => onBlockSelected(block));

      polygon.addTo(map);
      blockLayersRef.current.set(block.id, polygon);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.1));
    }
  }, [blocks, selectedBlockId, onBlockSelected]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Farm name overlay */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 1000,
          background: "rgba(14,26,7,0.85)",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #2D5A1B",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#F5EDDA" }}>{farmName}</div>
        <div
          style={{
            fontSize: "10px",
            color: "rgba(245,237,218,0.5)",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          {blocks.length} kamp{blocks.length !== 1 ? "e" : ""}
        </div>
      </div>

      {isDrawing && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(245,200,66,0.9)",
            color: "#0E1A07",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          Klik op die kaart om punte te plaas. Dubbelklik om te voltooi.
        </div>
      )}
    </div>
  );
}
