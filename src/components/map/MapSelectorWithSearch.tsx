import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, X, Crosshair, Navigation } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useGeolocation } from '../../hooks/useGeolocation';
import { 
  getLeaflet, 
  DEFAULT_COORDINATES, 
  reverseGeocode, 
  forwardGeocode,
  createLocationIcon,
  debounce,
  cleanupMap,
  getResponsiveMapHeight
} from '../../utils/mapUtils';

interface MapSelectorWithSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string } | null) => void;
  selectedLocation: { lat: number; lng: number; address?: string } | null;
  height?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

export function MapSelectorWithSearch({ 
  onLocationSelect, 
  selectedLocation, 
  height 
}: MapSelectorWithSearchProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Use geolocation hook
  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,
    requestLocation,
    isSupported: isGeolocationSupported
  } = useGeolocation();

  // Get responsive height
  const mapHeight = height || getResponsiveMapHeight();

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      setMapError(null);
      const L = await getLeaflet();

      // Initialize map with default coordinates
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        dragging: true,
        keyboard: true,
        tap: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], DEFAULT_COORDINATES.zoom);

      // Add tile layer with error handling
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiPk5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+'
      });

      tileLayer.on('tileerror', (e: any) => {
        console.warn('Tile loading error:', e);
      });

      tileLayer.addTo(map);

      // Handle map clicks
      map.on('click', handleMapClick);

      // Handle map load events
      map.on('load', () => {
        if (mountedRef.current) {
          setIsMapLoaded(true);
        }
      });

      // Handle map errors
      map.on('error', (e: any) => {
        console.error('Map error:', e);
        if (mountedRef.current) {
          setMapError('Error cargando el mapa. Verifique su conexión a internet.');
        }
      });

      mapInstanceRef.current = map;

      // Set existing marker if location is already selected
      if (selectedLocation && mountedRef.current) {
        await addMarker(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
        map.setView([selectedLocation.lat, selectedLocation.lng], 15);
      }

      if (mountedRef.current) {
        setIsMapLoaded(true);
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      if (mountedRef.current) {
        setMapError('No se pudo inicializar el mapa. Recargue la página e intente nuevamente.');
      }
    }
  }, [selectedLocation]);

  // Handle map click
  const handleMapClick = useCallback(async (e: any) => {
    if (!mountedRef.current) return;

    const { lat, lng } = e.latlng;
    
    try {
      // Remove existing marker
      await removeMarker();

      // Add new marker
      await addMarker(lat, lng);

      // Get address via reverse geocoding
      const address = await reverseGeocode(lat, lng);
      
      if (mountedRef.current) {
        onLocationSelect({ lat, lng, address });
        
        // Update marker popup
        if (markerRef.current) {
          markerRef.current.bindPopup(address).openPopup();
        }
      }
    } catch (error) {
      console.error('Error handling map click:', error);
      if (mountedRef.current) {
        onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      }
    }
  }, [onLocationSelect]);

  // Add marker to map
  const addMarker = useCallback(async (lat: number, lng: number, address?: string) => {
    if (!mapInstanceRef.current) return;

    try {
      const L = await getLeaflet();
      
      // Remove existing marker
      await removeMarker();

      // Add new marker
      markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      
      if (address) {
        markerRef.current.bindPopup(address);
      }
    } catch (error) {
      console.error('Error adding marker:', error);
    }
  }, []);

  // Remove marker from map
  const removeMarker = useCallback(async () => {
    if (markerRef.current && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      } catch (error) {
        console.warn('Error removing marker:', error);
      }
    }
  }, []);

  // Add current location marker
  const addCurrentLocationMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    try {
      const L = await getLeaflet();
      
      // Remove existing current location marker
      if (currentLocationMarkerRef.current) {
        mapInstanceRef.current.removeLayer(currentLocationMarkerRef.current);
      }

      // Create custom location icon
      const locationIcon = await createLocationIcon(true);
      
      if (locationIcon) {
        currentLocationMarkerRef.current = L.marker([lat, lng], { icon: locationIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Su ubicación actual');
      } else {
        currentLocationMarkerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'current-location-marker',
            html: '<div style="width: 16px; height: 16px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapInstanceRef.current);
      }
    } catch (error) {
      console.error('Error adding current location marker:', error);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!mountedRef.current || !query.trim() || query.length < 3) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await forwardGeocode(query);
        if (mountedRef.current) {
          setSearchResults(results);
          setShowResults(results.length > 0);
        }
      } catch (error) {
        console.error('Error searching places:', error);
        if (mountedRef.current) {
          setSearchResults([]);
          setShowResults(false);
        }
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    }, 500),
    []
  );

  // Handle search input
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Select search result
  const selectSearchResult = useCallback(async (result: SearchResult) => {
    if (!mountedRef.current) return;

    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;

    onLocationSelect({ lat, lng, address });
    setSearchQuery(address);
    setShowResults(false);

    // Update map view and marker
    if (mapInstanceRef.current) {
      try {
        await addMarker(lat, lng, address);
        mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
        
        if (markerRef.current) {
          markerRef.current.bindPopup(address).openPopup();
        }
      } catch (error) {
        console.error('Error updating map with search result:', error);
      }
    }
  }, [onLocationSelect, addMarker]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  // Handle get current location
  const handleGetCurrentLocation = useCallback(async () => {
    if (!isGeolocationSupported) {
      setMapError('La geolocalización no está soportada en este navegador');
      return;
    }

    requestLocation();
  }, [isGeolocationSupported, requestLocation]);

  // Update marker when selectedLocation changes
  useEffect(() => {
    const updateMarker = async () => {
      if (!mapInstanceRef.current || !mountedRef.current) return;

      if (selectedLocation) {
        await addMarker(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
        mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lng], 15);
      } else {
        await removeMarker();
      }
    };
    
    updateMarker();
  }, [selectedLocation, addMarker, removeMarker]);

  // Handle geolocation success
  useEffect(() => {
    const updateCurrentLocation = async () => {
      if (latitude !== null && longitude !== null && mapInstanceRef.current && mountedRef.current) {
        try {
          // Add current location marker
          await addCurrentLocationMarker(latitude, longitude);
          
          // Optionally center map on current location if no location is selected
          if (!selectedLocation) {
            mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
          }
        } catch (error) {
          console.error('Error updating current location:', error);
        }
      }
    };

    updateCurrentLocation();
  }, [latitude, longitude, selectedLocation, addCurrentLocationMarker]);

  // Initialize map on mount
  useEffect(() => {
    mountedRef.current = true;
    initializeMap();

    return () => {
      mountedRef.current = false;
      
      // Cleanup
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      const cleanup = async () => {
        try {
          const markers = [markerRef.current, currentLocationMarkerRef.current].filter(Boolean);
          cleanupMap(mapInstanceRef.current, markers);
          mapInstanceRef.current = null;
          markerRef.current = null;
          currentLocationMarkerRef.current = null;
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      };
      
      cleanup();
    };
  }, [initializeMap]);

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar lugar en Posadas..."
            value={searchQuery}
            onChange={handleSearchInput}
            className="pl-10 pr-10 text-sm"
            disabled={!isMapLoaded}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 sm:max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-xs sm:text-sm transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3 h-3 mt-1 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location Button */}
      {isGeolocationSupported && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={locationLoading || !isMapLoaded}
            className="flex items-center space-x-2 text-xs sm:text-sm"
          >
            {locationLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Navigation className="w-3 h-3" />
            )}
            <span>{locationLoading ? 'Obteniendo...' : 'Mi ubicación'}</span>
          </Button>
        </div>
      )}

      {/* Error Alerts */}
      {mapError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-xs sm:text-sm">
            {mapError}
          </AlertDescription>
        </Alert>
      )}

      {locationError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
            {locationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          style={{ height: mapHeight, width: '100%' }}
          className="rounded-lg border border-gray-300 overflow-hidden bg-gray-100"
        />
        
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Cargando mapa...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Location Info */}
      <div className="flex items-start space-x-2 text-xs sm:text-sm text-gray-600">
        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
        <span className="break-words min-h-[1.2em]">
          {selectedLocation 
            ? selectedLocation.address || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
            : 'Busque un lugar, use su ubicación actual o toque el mapa'
          }
        </span>
      </div>
      
      {/* Clear Location Button */}
      {selectedLocation && (
        <button
          type="button"
          onClick={() => {
            onLocationSelect(null);
            clearSearch();
          }}
          className="text-xs sm:text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          Limpiar ubicación
        </button>
      )}
    </div>
  );
}