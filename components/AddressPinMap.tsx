"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L, { type LeafletEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_ICON = L.divIcon({
  html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">📍</div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

/** Recenters the map whenever the pin moves to a new suggestion (but not on drag —
 * dragging happens locally on the map and shouldn't yank the view around). */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 17));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

export default function AddressPinMap({
  lat,
  lng,
  onMove,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
      <div className="h-56 w-full">
        <MapContainer
          center={[lat, lng]}
          zoom={17}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter lat={lat} lng={lng} />
          <Marker
            position={[lat, lng]}
            icon={PIN_ICON}
            draggable
            eventHandlers={{
              dragend: (e: LeafletEvent) => {
                const pos = (e.target as L.Marker).getLatLng();
                onMove(pos.lat, pos.lng);
              },
            }}
          />
        </MapContainer>
      </div>
      <p className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
        📍 Drag the pin if it's not quite on your doorstep — this is what
        customers see on your deal's map.
      </p>
    </div>
  );
}
