import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Search, Crosshair, MapPin, X } from 'lucide-react';

export default function LeafletMapPicker({
  initialLat,
  initialLng,
  initialArea = 'Madhapur',
  onSelectLocation,
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isUserMovingRef = useRef(false);

  // Default coordinates to Madhapur / Hitec City if not provided
  const defaultLat = initialLat && !isNaN(Number(initialLat)) ? Number(initialLat) : 17.4483;
  const defaultLng = initialLng && !isNaN(Number(initialLng)) ? Number(initialLng) : 78.3915;

  const [coords, setCoords] = useState({ lat: defaultLat, lng: defaultLng });
  const [placeTitle, setPlaceTitle] = useState(initialArea || 'Selected Location');
  const [addressSubtitle, setAddressSubtitle] = useState('Fetching exact address...');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Reverse geocoding to retrieve place title and formatted address from Nominatim
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const mainTitle = a.neighbourhood || a.suburb || a.residential || a.road || a.city_district || initialArea;
          const parts = [
            a.suburb || a.neighbourhood,
            a.road,
            a.city || 'Hyderabad',
            a.postcode,
          ].filter(Boolean);
          const fullAddr = parts.length > 0 ? parts.join(', ') : (data.display_name ? data.display_name.split(',').slice(0, 4).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);

          setPlaceTitle(mainTitle);
          setAddressSubtitle(fullAddr);
          return;
        }
      }
    } catch (_) {
      // Fallback to coordinates
    }
    setPlaceTitle(initialArea || 'Pinned Drop Spot');
    setAddressSubtitle(`${lat.toFixed(5)}, ${lng.toFixed(5)}, Hyderabad`);
  }, [initialArea]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = window.L;
    if (!L) {
      console.error('Leaflet is not loaded on window.L');
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: false, // Clean UI matching the mobile screenshot
      attributionControl: false,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 2000,
      easeLinearity: 0.15,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      wheelDebounceTime: 40,
    });
    mapInstanceRef.current = map;

    // Use OpenStreetMap standard tiles with high-performance buffering for buttery-smooth panning
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 6,
    }).addTo(map);

    // Initial reverse geocode
    reverseGeocode(defaultLat, defaultLng);

    // Listen to map movement
    map.on('movestart', () => {
      isUserMovingRef.current = true;
    });

    map.on('moveend', () => {
      isUserMovingRef.current = false;
      const center = map.getCenter();
      const newLat = Number(center.lat.toFixed(6));
      const newLng = Number(center.lng.toFixed(6));
      setCoords({ lat: newLat, lng: newLng });
      reverseGeocode(newLat, newLng);
    });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [defaultLat, defaultLng, reverseGeocode]);

  // GPS Locate Current Position
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1 });
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Could not get GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Live search for street or apartment
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim() || val.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const q = encodeURIComponent(`${val.trim()}, Hyderabad, Telangana`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (_) {
      // Quiet fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1 });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Confirm Location selection
  const handleConfirm = () => {
    if (onSelectLocation) {
      onSelectLocation({
        latitude: coords.lat,
        longitude: coords.lng,
        placeTitle,
        address: addressSubtitle,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-white flex flex-col font-sans select-none animate-fadeIn">
      {/* 1. Header with Back button and Title */}
      <div className="relative z-20 px-4 pt-3 pb-2.5 bg-white flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[#0c2340] shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-lg font-bold text-[#0c2340] tracking-tight">Select Your Location</h1>
      </div>

      {/* 2. Floating Search Bar */}
      <div className="relative z-20 px-4 pb-2 bg-white">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0d5c3a] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for apartment, street name..."
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-white rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]/20 focus:border-[#0d5c3a] placeholder:text-slate-400 font-medium text-[#0c2340]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto divide-y divide-slate-100 z-30">
            {searchResults.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(r)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/50 flex items-start gap-2.5 transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#0d5c3a] shrink-0 mt-0.5" />
                <span className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Fullscreen Map with Center Delivery Pin Tooltip */}
      <div className="relative flex-1 w-full overflow-hidden bg-slate-100">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Center Floating Delivery Marker Matching Screenshot in Brand Colors */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="relative flex flex-col items-center" style={{ transform: 'translateY(-28px)' }}>
            {/* Dark Brand Tooltip Bubble */}
            <div className="bg-[#0c2340] text-white px-4 py-2 rounded-xl shadow-2xl flex flex-col items-center text-center animate-bounce duration-1000">
              <span className="text-xs sm:text-[13px] font-bold text-white tracking-wide">
                Order will be delivered here
              </span>
              <span className="text-[10.5px] text-emerald-300 font-semibold mt-0.5">
                Place the pin to your exact location
              </span>
              {/* Downward triangle indicator */}
              <div
                className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0c2340] -mb-[5px] mt-1"
              />
            </div>

            {/* Brand Forest Green Drop Pin Marker */}
            <div className="relative mt-1 flex flex-col items-center">
              {/* Pin Head */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                style={{ background: '#0d5c3a' }}
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-inner" />
              </div>
              {/* Pin Stem */}
              <div className="w-1 h-3.5 rounded-b-full -mt-0.5" style={{ background: '#0d5c3a' }} />
              {/* Ground Shadow Ripple */}
              <div
                className="w-4 h-1.5 rounded-full mt-0.5 border border-[#0d5c3a]/40"
                style={{ background: 'rgba(13, 92, 58, 0.25)', filter: 'blur(0.5px)' }}
              />
            </div>
          </div>
        </div>

        {/* Floating GPS Crosshair Button (Bottom Right) */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="absolute right-4 bottom-4 z-10 w-11 h-11 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-[#0d5c3a] active:scale-90 transition-all hover:bg-slate-50"
          title="Locate me"
        >
          <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} style={{ color: '#0d5c3a' }} />
        </button>
      </div>

      {/* 4. Bottom Location Card with Place Name and Confirm Button */}
      <div className="relative z-20 px-5 pt-4 pb-6 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex flex-col gap-3.5">
        <div>
          <h2 className="text-xl font-extrabold text-[#0c2340] tracking-tight leading-snug">
            {placeTitle}
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
            {addressSubtitle}
          </p>
        </div>

        {/* Big Natural Milk Dairy Brand Green 'Confirm Location' Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3.5 rounded-2xl text-white text-base font-bold tracking-wide shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center hover:brightness-105"
          style={{ background: '#0d5c3a' }}
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
