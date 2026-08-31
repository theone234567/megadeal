"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Deal } from "@/lib/types";
import type { Coords } from "@/lib/geo";
import { formatMoney } from "@/lib/format";

// Leaflet's default marker images resolve relative to node_modules and
// break under webpack/Turbopack bundling — using emoji divIcons sidesteps
// that entirely and skips shipping extra marker image assets.
function pinIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">${emoji}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 24],
    popupAnchor: [0, -22],
  });
}

const DEAL_ICON = pinIcon("🏷️");
const YOU_ICON = pinIcon("📍");

/** Fits the map to whatever pins are showing, on mount and whenever the pin set changes. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)]);
  return null;
}

export default function DealsMap({
  deals,
  userLocation = null,
}: {
  deals: Deal[];
  userLocation?: Coords | null;
}) {
  const pinned = useMemo(
    () =>
      deals.filter(
        (d): d is Deal & { businessLat: number; businessLng: number } =>
          d.businessLat !== null && d.businessLng !== null
      ),
    [deals]
  );

  const points = useMemo<[number, number][]>(() => {
    const p: [number, number][] = pinned.map((d) => [d.businessLat, d.businessLng]);
    if (userLocation) p.push([userLocation.lat, userLocation.lng]);
    return p;
  }, [pinned, userLocation]);

  if (pinned.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
        None of these deals have a map location yet.
      </div>
    );
  }

  // NZ-wide fallback center — FitBounds immediately overrides this once the map mounts.
  const fallbackCenter: [number, number] = [-41.29, 174.78];

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-100 shadow-card">
      <MapContainer
        center={fallbackCenter}
        zoom={6}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={YOU_ICON}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {pinned.map((deal) => (
          <Marker key={deal.id} position={[deal.businessLat, deal.businessLng]} icon={DEAL_ICON}>
            <Popup>
              <Link href={`/deal/${deal.slug}`} className="font-semibold text-brand-700 hover:underline">
                {deal.name}
              </Link>
              {deal.businessName && (
                <div className="text-xs text-slate-500">{deal.businessName}</div>
              )}
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {formatMoney(deal.now, deal.currency, deal.formattedNow)}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
