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

interface PreviewBlock {
  index: number;
  name: string;
  geometry: { lat: number; lng: number }[];
  areaHa: number;
  isChecked: boolean;
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
  previewBlocks?: PreviewBlock[];
  activePreviewIndex?: number | null;
  onPreviewBlockClicked?: (index: number) => void;
  onPreviewBlockToggled?: (index: number) => void;
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
  previewBlocks,
  activePreviewIndex,
  onPreviewBlockClicked,
  onPreviewBlockToggled,
}: FarmMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const blockLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const previewLayersRef = useRef<Map<number, L.Polygon>>(new Map());
  const labelLayersRef = useRef<L.Marker[]>([]);
  const hasInitialFitRef = useRef(false);
  const lastBlockCountRef = useRef(0);
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
      labelLayersRef.current.forEach((l) => map.removeLayer(l));
      labelLayersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide draw controls during preview
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawControlRef.current) return;
    if (previewBlocks && previewBlocks.length > 0) {
      map.removeControl(drawControlRef.current);
    } else {
      map.addControl(drawControlRef.current);
    }
  }, [previewBlocks]);

  // Render block polygons + preview polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    blockLayersRef.current.forEach((layer) => map.removeLayer(layer));
    blockLayersRef.current.clear();

    // Clear preview layers
    previewLayersRef.current.forEach((layer) => map.removeLayer(layer));
    previewLayersRef.current.clear();

    // Clear labels
    labelLayersRef.current.forEach((layer) => map.removeLayer(layer));
    labelLayersRef.current = [];

    const bounds: L.LatLng[] = [];
    const inPreview = previewBlocks && previewBlocks.length > 0;

    // Existing blocks (dimmed if in preview mode)
    blocks.forEach((block, i) => {
      if (!block.geometry || block.geometry.length < 3) return;

      const latlngs = geometryToLatLngs(block.geometry);
      bounds.push(...latlngs);

      const isSelected = block.id === selectedBlockId;
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
      const dimmed = inPreview;

      const polygon = L.polygon(latlngs, {
        color: isSelected && !dimmed ? "#F5C842" : color,
        weight: isSelected && !dimmed ? 3 : 2,
        fillColor: color,
        fillOpacity: dimmed ? 0.08 : isSelected ? 0.3 : 0.15,
        opacity: dimmed ? 0.3 : 1,
      });

      const center = polygon.getBounds().getCenter();
      const label = L.divIcon({
        className: "",
        html: `<div style="
          font-size: 11px;
          font-weight: 700;
          color: ${dimmed ? "rgba(74,154,74,0.4)" : "#F5EDDA"};
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          white-space: nowrap;
          font-family: 'JetBrains Mono', monospace;
          pointer-events: none;
        ">${block.name}${block.area_hectares ? ` · ${block.area_hectares.toFixed(1)}ha` : ""}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const labelMarker = L.marker(center, { icon: label, interactive: false }).addTo(map);
      labelLayersRef.current.push(labelMarker);

      if (!dimmed) {
        polygon.on("click", () => onBlockSelected(block));
      }

      polygon.addTo(map);
      blockLayersRef.current.set(block.id, polygon);
    });

    // Preview blocks (gold dashed or solid if active)
    if (previewBlocks) {
      previewBlocks.forEach((pb) => {
        const latlngs = pb.geometry.map((p) => L.latLng(p.lat, p.lng));
        bounds.push(...latlngs);

        const isActive = pb.index === activePreviewIndex;

        const polygon = L.polygon(latlngs, {
          color: "#F5C842",
          weight: isActive ? 3 : pb.isChecked ? 2 : 1,
          fillColor: "#F5C842",
          fillOpacity: isActive ? 0.25 : pb.isChecked ? 0.1 : 0.03,
          dashArray: isActive ? undefined : "8,4",
          opacity: pb.isChecked ? 1 : 0.4,
        });

        const center = polygon.getBounds().getCenter();
        const label = L.divIcon({
          className: "",
          html: `<div style="
            font-size: 10px;
            font-weight: 700;
            color: ${isActive ? "#fff" : pb.isChecked ? "#F5C842" : "rgba(245,200,66,0.4)"};
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            white-space: nowrap;
            font-family: 'JetBrains Mono', monospace;
            pointer-events: none;
          ">${pb.name} · ${pb.areaHa.toFixed(1)}ha</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const labelMarker = L.marker(center, { icon: label, interactive: false }).addTo(map);
        labelLayersRef.current.push(labelMarker);

        polygon.on("click", (e: L.LeafletMouseEvent) => {
          if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            onPreviewBlockToggled?.(pb.index);
          } else {
            onPreviewBlockClicked?.(pb.index);
          }
        });

        polygon.addTo(map);
        previewLayersRef.current.set(pb.index, polygon);
      });
    }

    const blockCount = blocks.length + (previewBlocks?.length ?? 0);
    if (bounds.length > 0 && !hasInitialFitRef.current) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.1));
      hasInitialFitRef.current = true;
    } else if (bounds.length > 0 && blockCount !== lastBlockCountRef.current) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.1));
    }
    lastBlockCountRef.current = blockCount;
  }, [blocks, selectedBlockId, onBlockSelected, previewBlocks, activePreviewIndex, onPreviewBlockClicked, onPreviewBlockToggled]);

  // Pan to active preview block when selected from side panel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || activePreviewIndex == null) return;
    const layer = previewLayersRef.current.get(activePreviewIndex);
    if (layer) {
      map.fitBounds(layer.getBounds().pad(0.3));
    }
  }, [activePreviewIndex]);

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

      {previewBlocks && previewBlocks.length > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "12px",
              zIndex: 1000,
              background: "rgba(14,26,7,0.9)",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #2D5A1B",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "18px", height: "3px", background: "#4a9a4a", opacity: 0.4 }} />
              <span style={{ color: "rgba(245,237,218,0.5)" }}>Bestaande kampe</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "18px", height: "0", borderTop: "2px dashed #F5C842" }} />
              <span style={{ color: "#F5C842" }}>Nuwe kampe (KML)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "18px", height: "3px", background: "#F5C842" }} />
              <span style={{ color: "#fff" }}>Gekies</span>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "rgba(14,26,7,0.9)",
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #2D5A1B",
              fontSize: "11px",
              color: "rgba(245,237,218,0.7)",
            }}
          >
            Klik op &apos;n kamp om te wysig
          </div>
        </>
      )}
    </div>
  );
}
