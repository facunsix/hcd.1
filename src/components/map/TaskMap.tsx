import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { MapPin, Calendar, Users, Navigation, Loader2 } from 'lucide-react';
import { getLeaflet, DEFAULT_COORDINATES, cleanupMap, getResponsiveMapHeight } from '../../utils/mapUtils';

interface TaskMapProps {
  tasks: any[];
}

export function TaskMap({ tasks }: TaskMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mountedRef = useRef(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Get responsive height for map
  const mapHeight = '500px'; // Fixed height for this component

  useEffect(() => {
    mountedRef.current = true;

    const loadMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        setMapError(null);
        const L = await getLeaflet();

        // Initialize map with enhanced options
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
        }).setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], 12);

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

        // Handle map events
        map.on('load', () => {
          if (mountedRef.current) {
            setIsMapLoaded(true);
          }
        });

        map.on('error', (e: any) => {
          console.error('Map error:', e);
          if (mountedRef.current) {
            setMapError('Error cargando el mapa. Verifique su conexión a internet.');
          }
        });

        mapInstanceRef.current = map;

        // Add task markers
        await addTaskMarkers(L, map);

        if (mountedRef.current) {
          setIsMapLoaded(true);
        }

      } catch (error) {
        console.error('Error loading map:', error);
        if (mountedRef.current) {
          setMapError('No se pudo inicializar el mapa. Recargue la página e intente nuevamente.');
        }
      }
    };

    loadMap();

    return () => {
      mountedRef.current = false;
      
      const cleanup = async () => {
        try {
          cleanupMap(mapInstanceRef.current, markersRef.current);
          mapInstanceRef.current = null;
          markersRef.current = [];
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      };
      
      cleanup();
    };
  }, []);

  const addTaskMarkers = async (L: any, map: any) => {
    if (!mountedRef.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        try {
          map.removeLayer(marker);
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
      markersRef.current = [];

      // Create custom icons for different task statuses
      const createCustomIcon = (color: string, status: string) => {
        return L.divIcon({
          className: 'custom-task-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <div style="
                width: 10px;
                height: 10px;
                background-color: white;
                border-radius: 50%;
              "></div>
              ${status === 'overdue' ? `
                <div style="
                  position: absolute;
                  top: -5px;
                  right: -5px;
                  width: 12px;
                  height: 12px;
                  background: #dc2626;
                  border: 2px solid white;
                  border-radius: 50%;
                "></div>
              ` : ''}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      };

      const completedIcon = createCustomIcon('#10b981', 'completed'); // green
      const pendingIcon = createCustomIcon('#3b82f6', 'pending'); // blue
      const overdueIcon = createCustomIcon('#ef4444', 'overdue'); // red

      // Filter tasks with location
      const tasksWithLocation = tasks.filter(task => 
        task.location && 
        task.location.lat !== null && 
        task.location.lng !== null &&
        !isNaN(parseFloat(task.location.lat)) && 
        !isNaN(parseFloat(task.location.lng))
      );
      
      if (tasksWithLocation.length === 0) {
        return;
      }

      // Add markers for each task
      const validMarkers: any[] = [];

      tasksWithLocation.forEach(task => {
        try {
          const lat = parseFloat(task.location.lat);
          const lng = parseFloat(task.location.lng);
          
          // Validate coordinates
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn(`Invalid coordinates for task ${task.id}:`, lat, lng);
            return;
          }

          const isOverdue = !task.completed && new Date(task.endDate) < new Date();
          
          let icon;
          if (task.completed) {
            icon = completedIcon;
          } else if (isOverdue) {
            icon = overdueIcon;
          } else {
            icon = pendingIcon;
          }

          const marker = L.marker([lat, lng], { icon }).addTo(map);
          
          // Create enhanced popup content
          const formatDate = (dateString: string) => {
            try {
              return new Date(dateString).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } catch {
              return dateString;
            }
          };

          const statusText = task.completed ? 'Completada' : isOverdue ? 'Vencida' : 'Pendiente';
          const statusColor = task.completed ? '#10b981' : isOverdue ? '#ef4444' : '#3b82f6';

          const popupContent = `
            <div style="min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
              <div style="border-bottom: 2px solid ${statusColor}; padding-bottom: 8px; margin-bottom: 10px;">
                <h3 style="margin: 0; font-weight: 600; font-size: 16px; color: #1f2937;">${task.title}</h3>
              </div>
              
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.4;">${task.description}</p>
              
              <div style="display: grid; gap: 6px; font-size: 13px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 600; color: #374151;">Estado:</span>
                  <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${statusText}</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 600; color: #374151;">Área:</span>
                  <span style="color: #6b7280;">${task.workArea || 'Sin área'}</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 600; color: #374151;">Período:</span>
                  <span style="color: #6b7280;">${formatDate(task.startDate)} - ${formatDate(task.endDate)}</span>
                </div>
                
                ${task.assignedUsers && task.assignedUsers.length > 0 ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 600; color: #374151;">Asignado a:</span>
                  <span style="color: #6b7280;">${task.assignedUsers.length} usuario(s)</span>
                </div>
                ` : ''}
                
                ${task.location.address ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">Dirección:</div>
                  <div style="color: #6b7280; font-size: 12px; line-height: 1.3;">${task.location.address}</div>
                </div>
                ` : ''}
              </div>
            </div>
          `;
          
          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
          });
          
          // Add click event to show task details in sidebar
          marker.on('click', () => {
            if (mountedRef.current) {
              setSelectedTask(task);
            }
          });

          markersRef.current.push(marker);
          validMarkers.push(marker);

        } catch (error) {
          console.error(`Error creating marker for task ${task.id}:`, error);
        }
      });

      // Fit map to show all markers if we have valid markers
      if (validMarkers.length > 0) {
        try {
          const group = L.featureGroup(validMarkers);
          const bounds = group.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (error) {
          console.warn('Error fitting map bounds:', error);
        }
      }

    } catch (error) {
      console.error('Error adding task markers:', error);
    }
  };

  // Update markers when tasks change
  useEffect(() => {
    if (mapInstanceRef.current && isMapLoaded && mountedRef.current) {
      const updateMarkers = async () => {
        try {
          const L = await getLeaflet();
          await addTaskMarkers(L, mapInstanceRef.current);
        } catch (error) {
          console.error('Error updating markers:', error);
        }
      };
      
      updateMarkers();
    }
  }, [tasks, isMapLoaded]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Media';
    }
  };

  const isOverdue = (task: any) => {
    return !task.completed && new Date(task.endDate) < new Date();
  };

  const openInMaps = (task: any) => {
    if (task.location && task.location.lat && task.location.lng) {
      const { lat, lng } = task.location;
      const query = task.location.address || `${lat},${lng}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Mapa de Actividades</span>
            </CardTitle>
            <CardDescription>
              Ubicaciones de las actividades asignadas en Posadas, Misiones
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {mapError && (
              <Alert className="m-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {mapError}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="relative">
              <div 
                ref={mapRef} 
                style={{ height: mapHeight, width: '100%' }}
                className="rounded-b-lg overflow-hidden bg-gray-100"
              />
              
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-b-lg">
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Cargando mapa...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Leyenda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                <span>Pendiente</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                <span>Completada</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                <span>Vencida</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Details Sidebar */}
      <div className="space-y-4">
        {selectedTask ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de la Actividad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{selectedTask.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span>
                    {formatDate(selectedTask.startDate)} - {formatDate(selectedTask.endDate)}
                  </span>
                </div>

                {selectedTask.location?.address && (
                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 leading-relaxed">{selectedTask.location.address}</span>
                  </div>
                )}

                {selectedTask.assignedUsers && selectedTask.assignedUsers.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>
                      {selectedTask.assignedUsers.length} usuario(s) asignado(s)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getPriorityColor(selectedTask.priority)}>
                  {getPriorityLabel(selectedTask.priority)}
                </Badge>
                {selectedTask.completed && (
                  <Badge className="bg-green-100 text-green-800">
                    Completada
                  </Badge>
                )}
                {isOverdue(selectedTask) && (
                  <Badge className="bg-red-100 text-red-800">
                    Vencida
                  </Badge>
                )}
                {selectedTask.workArea && (
                  <Badge variant="outline">
                    {selectedTask.workArea}
                  </Badge>
                )}
              </div>

              {selectedTask.location && (
                <Button
                  onClick={() => openInMaps(selectedTask)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir en Google Maps
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">
                Selecciona una actividad
              </h3>
              <p className="text-sm text-gray-600">
                Haz clic en un marcador del mapa para ver los detalles de la actividad.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estadísticas del Mapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total con ubicación:</span>
                <Badge variant="outline" className="ml-2">
                  {tasks.filter(t => t.location && t.location.lat && t.location.lng).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completadas:</span>
                <Badge className="bg-green-100 text-green-800 ml-2">
                  {tasks.filter(t => t.location && t.location.lat && t.location.lng && t.completed).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pendientes:</span>
                <Badge className="bg-blue-100 text-blue-800 ml-2">
                  {tasks.filter(t => t.location && t.location.lat && t.location.lng && !t.completed && new Date(t.endDate) >= new Date()).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Vencidas:</span>
                <Badge className="bg-red-100 text-red-800 ml-2">
                  {tasks.filter(t => t.location && t.location.lat && t.location.lng && !t.completed && new Date(t.endDate) < new Date()).length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}