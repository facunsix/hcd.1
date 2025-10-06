// Utility functions for map operations and optimizations

let leafletInstance: any = null;
let leafletCSSLoaded = false;

// Singleton pattern for Leaflet to avoid multiple imports
export const getLeaflet = async () => {
  if (leafletInstance) {
    return leafletInstance;
  }

  try {
    // Dynamic import of Leaflet
    const L = (await import('leaflet')).default;
    
    // Load CSS only once
    if (!leafletCSSLoaded && !document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      leafletCSSLoaded = true;
    }

    // Fix default markers issue
    if (L.Icon?.Default?.prototype) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }

    leafletInstance = L;
    return L;
  } catch (error) {
    console.error('Error loading Leaflet:', error);
    throw new Error('No se pudo cargar el sistema de mapas');
  }
};

// Default coordinates for Posadas, Misiones, Argentina
export const DEFAULT_COORDINATES = {
  lat: -27.3676,
  lng: -55.8967,
  zoom: 13
};

// Bounds for Posadas area for better search results
export const POSADAS_BOUNDS = {
  viewbox: '-56.5,-26.5,-55.5,-28.5',
  bounded: 1
};

// Reverse geocoding function with error handling
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
      { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'ConcejoPosadas/1.0'
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

// Forward geocoding function with improved search
export const forwardGeocode = async (query: string): Promise<Array<{
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}>> => {
  if (!query.trim() || query.length < 3) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const searchQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&limit=5&countrycodes=ar&viewbox=${POSADAS_BOUNDS.viewbox}&bounded=${POSADAS_BOUNDS.bounded}&addressdetails=1&accept-language=es`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ConcejoPosadas/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Forward geocoding failed:', error);
    return [];
  }
};

// Utility to check if coordinates are within Posadas area
export const isWithinPosadasArea = (lat: number, lng: number): boolean => {
  // Rough bounds for Posadas metropolitan area
  const bounds = {
    north: -26.5,
    south: -28.5,
    east: -55.5,
    west: -56.5
  };

  return lat >= bounds.south && lat <= bounds.north && 
         lng >= bounds.west && lng <= bounds.east;
};

// Create custom marker icon for current location
export const createLocationIcon = async (isCurrentLocation = false) => {
  const L = await getLeaflet();
  
  if (isCurrentLocation) {
    return L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            width: 20px;
            height: 20px;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
        </style>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  return null; // Use default marker for other locations
};

// Debounce utility for search input
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Map cleanup utility
export const cleanupMap = (mapInstance: any, markers: any[] = []) => {
  try {
    // Remove all markers
    markers.forEach(marker => {
      if (marker && mapInstance) {
        mapInstance.removeLayer(marker);
      }
    });

    // Remove map instance
    if (mapInstance) {
      mapInstance.remove();
    }
  } catch (error) {
    console.warn('Error during map cleanup:', error);
  }
};

// Responsive map height based on screen size
export const getResponsiveMapHeight = (): string => {
  if (typeof window === 'undefined') return '300px';
  
  const width = window.innerWidth;
  
  if (width < 640) return '200px';      // Mobile
  if (width < 768) return '250px';      // Small tablet
  if (width < 1024) return '300px';     // Tablet
  if (width < 1440) return '350px';     // Desktop
  return '400px';                       // Large desktop
};