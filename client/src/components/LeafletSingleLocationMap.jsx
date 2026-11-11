import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * LeafletSingleLocationMap
 * Displays an interactive Leaflet map showing exclusively the single delivery drop location.
 */
export default function LeafletSingleLocationMap({
  lat = 17.4483,
  lng = 78.3915,
  title = 'Customer Location',
  address = 'Doorstep Address',
  partnerName = '',
  height = '320px',
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Validate coordinates with fallbacks
  const validLat = Number(lat) && !isNaN(Number(lat)) && Number(lat) !== 0 ? Number(lat) : 17.4483;
  const validLng = Number(lng) && !isNaN(Number(lng)) && Number(lng) !== 0 ? Number(lng) : 78.3915;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = window.L;
    if (!L) {
      console.warn('Leaflet (window.L) is not loaded.');
      return;
    }

    // Clean up previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [validLat, validLng],
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // High-performance OpenStreetMap tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Custom high-contrast green drop pin
      const singlePinIcon = L.divIcon({
        className: 'single-location-leaflet-pin',
        html: `
          <div style="position:relative; width:40px; height:48px; display:flex; flex-direction:column; align-items:center;">
            <div style="width:38px; height:38px; background:#059669; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:3px solid #ffffff; box-shadow:0 6px 14px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
              <span style="transform:rotate(45deg); font-size:16px;">🥛</span>
            </div>
            <div style="width:10px; height:4px; background:rgba(0,0,0,0.3); border-radius:50%; margin-top:2px;"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 44],
        popupAnchor: [0, -42],
      });

      // Add ONLY this single marker
      const marker = L.marker([validLat, validLng], { icon: singlePinIcon }).addTo(map);

      const popupContent = `
        <div style="font-family:inherit; min-width:180px; padding:4px 2px;">
          <div style="font-size:13px; font-weight:900; color:#0f172a; margin-bottom:2px;">
            📍 ${title}
          </div>
          <div style="font-size:11px; color:#475569; line-height:1.3; margin-bottom:6px;">
            ${address}
          </div>
          ${partnerName ? `<div style="font-size:10px; color:#64748b; margin-bottom:4px;">🚚 Fulfilled by: <b>${partnerName}</b></div>` : ''}
          <div style="display:inline-block; font-size:9.5px; font-weight:800; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:4px; padding:2px 6px; text-transform:uppercase;">
            ✓ Doorstep Location Only
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { autoClose: false, closeOnClick: false }).openPopup();

      // Invalidate size after container layout renders
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.setView([validLat, validLng], 17);
        }
        setMapLoaded(true);
      }, 150);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing single location Leaflet map:', err);
    }
  }, [validLat, validLng, title, address, partnerName]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${validLat},${validLng}`;

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #059669', background: '#f8fafc' }}>
      {/* Map Element */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Info Pill on Map */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(6px)',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.74rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
        <span style={{ fontWeight: 800 }}>Leaflet Map:</span>
        <span style={{ color: '#cbd5e1' }}>{title} ({validLat.toFixed(4)}, {validLng.toFixed(4)})</span>
      </div>

      {/* External Directions link */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          background: '#ffffff',
          color: '#059669',
          border: '1.5px solid #059669',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.72rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          textDecoration: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        }}
      >
        <Navigation size={13} />
        <span>Directions</span>
        <ExternalLink size={11} />
      </a>
    </div>
  );
}
