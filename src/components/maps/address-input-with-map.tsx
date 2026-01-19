"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin, Loader2, X } from "lucide-react";

interface AddressInputWithMapProps {
    value: string;
    latitude?: number | null;
    longitude?: number | null;
    onChange: (address: string, lat: number | null, lng: number | null, placeId: string | null) => void;
    placeholder?: string;
    label?: string;
}

const mapContainerStyle = {
    width: "100%",
    height: "200px",
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

const libraries: ("places")[] = ["places"];

export function AddressInputWithMap({
    value,
    latitude,
    longitude,
    onChange,
    placeholder = "Buscar dirección...",
    label = "Dirección"
}: AddressInputWithMapProps) {
    const [inputValue, setInputValue] = useState(value || "");
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showMap, setShowMap] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const placesContainerRef = useRef<HTMLDivElement>(null);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    useEffect(() => {
        setInputValue(value || "");
        if (latitude && longitude) {
            setShowMap(true);
        }
    }, [value, latitude, longitude]);

    // Initialize services when Google Maps is loaded
    useEffect(() => {
        if (isLoaded && !autocompleteService.current) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
        }
        if (isLoaded && !placesService.current && placesContainerRef.current) {
            // Create PlacesService using a div element (doesn't require a map)
            placesService.current = new google.maps.places.PlacesService(placesContainerRef.current);
        }
    }, [isLoaded]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        if (!val || val.length < 3 || !autocompleteService.current) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await autocompleteService.current.getPlacePredictions({
                input: val,
                componentRestrictions: { country: "ar" }, // Argentina
                types: ["geocode"] // Use geocode for address-level results
            });

            setSuggestions(response.predictions || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Autocomplete error:", error);
        }
    };

    const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!placesService.current) return;

        placesService.current.getDetails(
            { placeId: prediction.place_id, fields: ["geometry", "formatted_address"] },
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const formattedAddress = place.formatted_address || prediction.description;

                    setInputValue(formattedAddress);
                    onChange(formattedAddress, lat, lng, prediction.place_id);
                    setShowMap(true);
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            }
        );
    };

    const clearAddress = () => {
        setInputValue("");
        onChange("", null, null, null);
        setShowMap(false);
    };

    const hasLocation = latitude && longitude;

    return (
        <div className="space-y-3">
            {/* Hidden div for PlacesService (required for getDetails) */}
            <div ref={placesContainerRef} style={{ display: 'none' }} />

            <label className="text-sm font-medium text-foreground">{label}</label>

            <div className="relative">
                <MapPin className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={placeholder}
                    className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={clearAddress}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur from firing
                                    handleSelectSuggestion(suggestion);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex items-start gap-3"
                            >
                                <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{suggestion.structured_formatting.main_text}</p>
                                    <p className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Mini Map */}
            {showMap && hasLocation && isLoaded && (
                <div className="rounded-xl overflow-hidden border border-border">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={{ lat: latitude!, lng: longitude! }}
                        zoom={16}
                        onLoad={onMapLoad}
                        options={{
                            styles: darkModeStyles,
                            disableDefaultUI: true,
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false,
                        }}
                    >
                        <Marker
                            position={{ lat: latitude!, lng: longitude! }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 12,
                                fillColor: "#f97316",
                                fillOpacity: 1,
                                strokeColor: "#fff",
                                strokeWeight: 3,
                            }}
                        />
                    </GoogleMap>
                </div>
            )}

            {!isLoaded && showMap && (
                <div className="h-[200px] rounded-xl bg-muted flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={24} />
                </div>
            )}
        </div>
    );
}
