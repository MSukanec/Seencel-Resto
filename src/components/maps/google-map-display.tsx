"use client";

import { GoogleMap, useJsApiLoader, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle?: string;
    color?: string;
    isRestaurant?: boolean;
    logoUrl?: string | null;
}

interface GoogleMapDisplayProps {
    center?: { lat: number; lng: number };
    markers?: MapMarker[];
    zoom?: number;
    height?: string;
    onMarkerClick?: (marker: MapMarker) => void;
    showInfoWindow?: boolean;
}

const defaultCenter = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires

const mapContainerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
};

const darkModeStyles = [
    { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8b8b8b" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Custom restaurant marker with logo inside a pin shape
function RestaurantPinMarker({
    marker,
    onClick
}: {
    marker: MapMarker;
    onClick: () => void;
}) {
    return (
        <OverlayView
            position={{ lat: marker.lat, lng: marker.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -height,
            })}
        >
            <div
                onClick={onClick}
                className="cursor-pointer transform hover:scale-110 transition-transform"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}
            >
                {/* Pin/drop shape with logo */}
                <div className="flex flex-col items-center">
                    {/* The pin body */}
                    <div
                        className="w-12 h-12 rounded-full border-[3px] border-white overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: marker.color || '#16a34a' }}
                    >
                        {marker.logoUrl ? (
                            <img
                                src={marker.logoUrl}
                                alt={marker.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-lg font-bold">
                                {marker.title.charAt(0)}
                            </span>
                        )}
                    </div>
                    {/* The pin point/tail - SVG triangle */}
                    <svg width="16" height="10" viewBox="0 0 16 10" className="-mt-[2px]">
                        <polygon points="8,10 0,0 16,0" fill="white" />
                    </svg>
                </div>
            </div>
        </OverlayView>
    );
}

export function GoogleMapDisplay({
    center,
    markers = [],
    zoom = 13,
    height = "400px",
    onMarkerClick,
    showInfoWindow = true,
}: GoogleMapDisplayProps) {
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: ["places"],
    });

    const mapCenter = useMemo(() => {
        if (center) return center;
        if (markers.length > 0) {
            return { lat: markers[0].lat, lng: markers[0].lng };
        }
        return defaultCenter;
    }, [center, markers]);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    // Auto-fit bounds to show all markers whenever they change
    useEffect(() => {
        if (map && markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => {
                bounds.extend({ lat: marker.lat, lng: marker.lng });
            });

            if (markers.length === 1) {
                // Single marker: center on it with a reasonable zoom
                map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
                map.setZoom(15);
            } else {
                // Multiple markers: fit all of them with padding
                map.fitBounds(bounds, 60);
            }
        }
    }, [map, markers]);

    const handleMarkerClick = (marker: MapMarker) => {
        setSelectedMarker(marker);
        onMarkerClick?.(marker);
    };

    // Generate marker icon for customer markers
    const getCustomerMarkerIcon = () => ({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#f97316",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
    });

    if (loadError) {
        return (
            <div
                className="flex items-center justify-center bg-muted rounded-xl text-muted-foreground"
                style={{ height }}
            >
                Error al cargar el mapa
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div
                className="flex items-center justify-center bg-muted rounded-xl"
                style={{ height }}
            >
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // Separate restaurant and customer markers
    const restaurantMarkers = markers.filter(m => m.isRestaurant);
    const customerMarkers = markers.filter(m => !m.isRestaurant);

    return (
        <div style={{ height }} className="rounded-xl overflow-hidden border border-border">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={zoom}
                onLoad={onLoad}
                options={{
                    styles: darkModeStyles,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                }}
            >
                {/* Customer markers - regular circles */}
                {customerMarkers.map((marker) => (
                    <Marker
                        key={marker.id}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        title={marker.title}
                        onClick={() => handleMarkerClick(marker)}
                        icon={getCustomerMarkerIcon()}
                        zIndex={1}
                    />
                ))}

                {/* Restaurant markers - custom pin with logo */}
                {restaurantMarkers.map((marker) => (
                    <RestaurantPinMarker
                        key={marker.id}
                        marker={marker}
                        onClick={() => handleMarkerClick(marker)}
                    />
                ))}

                {showInfoWindow && selectedMarker && !selectedMarker.isRestaurant && (
                    <InfoWindow
                        position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div className="p-2 min-w-[120px]">
                            <h3 className="font-bold text-sm text-gray-900">{selectedMarker.title}</h3>
                            {selectedMarker.subtitle && (
                                <p className="text-xs text-gray-600 mt-1">{selectedMarker.subtitle}</p>
                            )}
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
