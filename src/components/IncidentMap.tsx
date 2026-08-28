import { ImageOverlay, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DivIcon, type DragEndEvent, type LeafletMouseEvent } from "leaflet";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { classifyLabel } from "../lib/classifyLabel";
import { loadGeopdf } from "../lib/loadGeopdf";
import { unitMarkerLabel, unitMarkerSrc } from "../lib/unitMarker";
import { useStore } from "../store";
import { rowTone, CATEGORY_LABELS, type Capability, type MapPoint, type MapPointCategory, type MarkerKind } from "../types";
import samplePdfUrl from "../../docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf?url";

const CATEGORIES: MapPointCategory[] = [
  "drop_point",
  "junction",
  "helispot",
  "unimproved_helispot",
  "helibase",
  "icp",
  "camp",
  "staging",
  "safety_zone",
  "lookout",
  "incident_base",
];

function dockPosition(point: MapPoint, index: number, count: number): [number, number] {
  const meters = 90;
  const earth = 6378137;
  const angle = (2 * Math.PI * index) / Math.max(count, 1) - Math.PI / 2;
  const dLat = (meters * Math.cos(angle)) / earth;
  const dLon = (meters * Math.sin(angle)) / (earth * Math.cos((point.lat * Math.PI) / 180));
  return [point.lat + (dLat * 180) / Math.PI, point.lon + (dLon * 180) / Math.PI];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resourceIcon(kind: MarkerKind, capability: Capability, tone: ReturnType<typeof rowTone>, caption: string) {
  const src = unitMarkerSrc(kind, capability);
  const kindLabel = unitMarkerLabel(kind, capability);
  const text = escapeHtml(caption.trim() || kindLabel);
  return new DivIcon({
    className: "res-marker",
    html: `<span class="marker-stack"><span class="res-marker-inner tone-${tone}"><img src="${src}" alt="${kindLabel}" /></span><span class="marker-caption">${text}</span></span>`,
    iconSize: [96, 58],
    iconAnchor: [48, 20],
  });
}

function FitOverlay({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

function snapIcon(moving: boolean) {
  return new DivIcon({
    className: "snap-marker",
    html: `<span class="snap-dot${moving ? " moving" : ""}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function PlaceClick({
  enabled,
  skipUntil,
  onPlace,
}: {
  enabled: boolean;
  skipUntil: MutableRefObject<number>;
  onPlace: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!enabled || Date.now() < skipUntil.current) return;
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function IncidentMap() {
  const {
    points,
    resources,
    placements,
    overlay,
    pdfError,
    pdfBusy,
    dropOnClosest,
    addPoint,
    movePoint,
    relocatingPointId,
    cancelRelocate,
    setOverlay,
    setPdfBusy,
    readOnly,
  } = useStore();
  const accepted = points.filter((p) => p.review === "accepted");
  const moving = accepted.find((p) => p.id === relocatingPointId);
  const [label, setLabel] = useState("ICP");
  const [category, setCategory] = useState<MapPointCategory>("icp");
  const [placeMode, setPlaceMode] = useState(true);
  const loadedOnce = useRef(false);
  const skipClickUntil = useRef(0);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    let cancelled = false;
    (async () => {
      setPdfBusy(true);
      try {
        const res = await fetch(samplePdfUrl);
        const buf = new Uint8Array(await res.arrayBuffer());
        const loaded = await loadGeopdf(buf, "High Lava ops map");
        if (!cancelled) setOverlay(loaded);
      } catch (err) {
        if (!cancelled) setOverlay(null, err instanceof Error ? err.message : "Failed to load GeoPDF");
      } finally {
        if (!cancelled) setPdfBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setOverlay, setPdfBusy]);

  const atCounts = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const place of placements) {
      if (!place.atPointId) continue;
      const list = counts.get(place.atPointId) ?? [];
      list.push(place.resourceId);
      counts.set(place.atPointId, list);
    }
    return counts;
  }, [placements]);

  function onDragEnd(resourceId: string, e: DragEndEvent) {
    const ll = e.target.getLatLng();
    dropOnClosest(resourceId, ll.lat, ll.lng);
  }

  function onSnapDragEnd(pointId: string, e: DragEndEvent) {
    skipClickUntil.current = Date.now() + 400;
    const ll = e.target.getLatLng();
    movePoint(pointId, ll.lat, ll.lng);
  }

  function applyLabelHint(raw: string) {
    setLabel(raw);
    const hint = classifyLabel(raw);
    if (hint) {
      setLabel(hint.label);
      setCategory(hint.category);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPdfBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const loaded = await loadGeopdf(buf, file.name);
      setOverlay(loaded);
    } catch (err) {
      setOverlay(null, err instanceof Error ? err.message : "Failed to load GeoPDF");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="map-pane">
      <div className="map-float">
        <div className="map-float-top">
          <div>
            <h2>Incident map</h2>
            <p className="pdf-status">
              {pdfBusy ? "Loading High Lava ops map…" : pdfError ? pdfError : overlay ? overlay.name : "No PDF"}
            </p>
          </div>
          <label className="btn ghost pdf-upload">
            Replace PDF
            <input type="file" accept="application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
        {!readOnly ? <div className="place-form">
          <input
            className="field"
            value={label}
            onChange={(e) => applyLabelHint(e.target.value)}
            placeholder="DP-12, H-3, ICP…"
            aria-label="New point label"
          />
          <select
            className="field"
            value={category}
            onChange={(e) => setCategory(e.target.value as MapPointCategory)}
            aria-label="Point type"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button type="button" className={placeMode && !moving ? "btn primary" : "btn"} onClick={() => setPlaceMode((v) => !v)}>
            {placeMode && !moving ? "Click map to place" : "Place point"}
          </button>
          {moving ? (
            <>
              <span className="move-hint">Click the map or drag the marker to move {moving.label}</span>
              <button type="button" className="btn" onClick={cancelRelocate}>
                Cancel move
              </button>
            </>
          ) : null}
        </div> : null}
      </div>
      <MapContainer className="leaflet-host" center={[45.88, -122.11]} zoom={11} scrollWheelZoom attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {overlay ? (
          <>
            <ImageOverlay url={overlay.imageUrl} bounds={overlay.bounds} opacity={1} zIndex={200} />
            <FitOverlay bounds={overlay.bounds} />
          </>
        ) : null}
        <PlaceClick
          enabled={!readOnly && Boolean(overlay) && (Boolean(moving) || placeMode)}
          skipUntil={skipClickUntil}
          onPlace={(lat, lon) => {
            if (moving) {
              movePoint(moving.id, lat, lon);
              return;
            }
            const text = label.trim();
            if (!text) return;
            addPoint(lat, lon, text, category);
            setPlaceMode(false);
          }}
        />
        {accepted.map((pt) => (
          <Marker
            key={pt.id}
            position={[pt.lat, pt.lon]}
            draggable={!readOnly}
            zIndexOffset={-200}
            icon={snapIcon(pt.id === relocatingPointId)}
            eventHandlers={{ dragend: (e) => onSnapDragEnd(pt.id, e as DragEndEvent) }}
          >
            <Popup>{readOnly ? pt.label : `${pt.label} — drag or use Move in the snap list`}</Popup>
          </Marker>
        ))}
        {resources.map((r) => {
          const place = placements.find((p) => p.resourceId === r.id);
          if (!place?.atPointId) return null;
          const at = points.find((pt) => pt.id === place.atPointId);
          if (!at || at.review !== "accepted") return null;
          const siblings = atCounts.get(place.atPointId) ?? [r.id];
          const index = siblings.indexOf(r.id);
          const position = dockPosition(at, index, siblings.length);
          return (
            <Marker
              key={r.id}
              position={position}
              draggable={!readOnly}
              icon={resourceIcon(r.kind, r.capability, rowTone(place), r.fireName)}
              eventHandlers={{ dragend: (e) => onDragEnd(r.id, e as DragEndEvent) }}
            >
              <Popup>
                {r.fireName}
                {place.destination ? ` → ${place.destination}` : ""}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
