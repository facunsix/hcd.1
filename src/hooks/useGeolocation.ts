import { useState, useEffect, useRef } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout ?? 15000,
    maximumAge: options.maximumAge ?? 300000, // 5 minutes
  };

  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La geolocalización no está soportada en este navegador',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Set a timeout for the geolocation request
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: 'Tiempo de espera agotado para obtener la ubicación',
        loading: false,
      }));
    }, defaultOptions.timeout);

    const onSuccess = (position: GeolocationPosition) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      let errorMessage = 'Error desconocido al obtener la ubicación';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permiso de ubicación denegado. Por favor, habilite la ubicación en su navegador.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Información de ubicación no disponible. Verifique su conexión GPS/WiFi.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tiempo de espera agotado para obtener la ubicación.';
          break;
        default:
          errorMessage = `Error de geolocalización: ${error.message}`;
      }

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    };

    if (options.watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        defaultOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, defaultOptions);
    }
  };

  const requestLocation = () => {
    getCurrentPosition();
  };

  const stopWatching = () => {
    clearWatch();
    setState(prev => ({ ...prev, loading: false }));
  };

  useEffect(() => {
    return () => {
      clearWatch();
    };
  }, []);

  return {
    ...state,
    requestLocation,
    stopWatching,
    isSupported: 'geolocation' in navigator,
  };
}