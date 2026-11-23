import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import {
  BRANCH_COORDINATES,
  resolvePhnomPenhLocationFromCoords,
  type PhnomPenhCoordinateMatch,
} from '../../utils/orderTracking';

export interface SelectedMapLocation {
  lat: number;
  lng: number;
  khan: string;
  sangkat: string;
  streetAddress: string;
  nearestBranchName: string;
  distanceKm: number;
  source: 'geolocation' | 'map-pin' | 'places-search';
}

interface CheckoutLocationPickerProps {
  value?: { lat: number; lng: number };
  onLocationSelect: (loc: SelectedMapLocation) => void;
}

const DEFAULT_CENTER = { lat: 11.5688, lng: 104.8994 };

interface PlaceSuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  rawPrediction: {
    toPlace: () => {
      fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
      displayName?: string | null;
      formattedAddress?: string | null;
      location?: { lat: () => number; lng: () => number } | null;
    };
  };
}

function InteractiveCheckoutMapInner({
  pinPosition,
  onPinMove,
  onPlaceChosen,
}: {
  pinPosition: { lat: number; lng: number };
  onPinMove: (coords: { lat: number; lng: number }, source: 'geolocation' | 'map-pin', labelHint?: string) => void;
  onPlaceChosen: (loc: SelectedMapLocation) => void;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const sessionTokenRef = useRef<unknown>(null);

  useEffect(() => {
    if (!map) return;
    map.panTo(pinPosition);
  }, [map, pinPosition]);

  // Modern Places API (New): AutocompleteSuggestion.fetchAutocompleteSuggestions with session token
  useEffect(() => {
    const trimmed = query.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const lib = placesLib as unknown as {
          AutocompleteSessionToken: new () => unknown;
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: (req: Record<string, unknown>) => Promise<{
              suggestions?: Array<{
                placePrediction?: {
                  placeId?: string;
                  mainText?: { text?: string };
                  secondaryText?: { text?: string };
                  text?: { text?: string };
                  toPlace: () => {
                    fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
                    displayName?: string | null;
                    formattedAddress?: string | null;
                    location?: { lat: () => number; lng: () => number } | null;
                  };
                };
              }>;
            }>;
          };
        };

        if (!sessionTokenRef.current && lib.AutocompleteSessionToken) {
          sessionTokenRef.current = new lib.AutocompleteSessionToken();
        }

        const res = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['kh'],
          locationBias: {
            center: DEFAULT_CENTER,
            radius: 25000,
          },
        });

        const parsed: PlaceSuggestionItem[] = (res?.suggestions ?? [])
          .filter((s) => Boolean(s.placePrediction))
          .slice(0, 5)
          .map((s, idx) => {
            const pred = s.placePrediction!;
            return {
              placeId: pred.placeId ?? `pred-${idx}`,
              mainText: pred.mainText?.text ?? pred.text?.text ?? 'Phnom Penh Location',
              secondaryText: pred.secondaryText?.text ?? 'Phnom Penh, Cambodia',
              rawPrediction: pred,
            };
          });
        setSuggestions(parsed);
      } catch (err) {
        const msg = String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [placesLib, query]);

  const handleSelectSuggestion = async (item: PlaceSuggestionItem) => {
    setSuggestions([]);
    setQuery(item.mainText);
    setStatusError(null);
    try {
      const place = item.rawPrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      sessionTokenRef.current = null;
      if (place.location) {
        const lat = place.location.lat();
        const lng = place.location.lng();
        const resolved = resolvePhnomPenhLocationFromCoords(lat, lng);
        const formattedStreet =
          place.formattedAddress ||
          [place.displayName, item.secondaryText].filter(Boolean).join(', ');

        onPlaceChosen({
          lat,
          lng,
          khan: resolved.khan,
          sangkat: resolved.sangkat,
          streetAddress: formattedStreet,
          nearestBranchName: resolved.nearestBranchName,
          distanceKm: resolved.distanceKm,
          source: 'places-search',
        });
        setStatusMessage(
          `Pinned ${place.displayName ?? item.mainText} · ${resolved.distanceKm} km from ${resolved.nearestBranchName}`,
        );
      }
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('OVER_QUERY_LIMIT') ||
        msg.includes('429')
      ) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setStatusError('Could not load details for that place. Try dropping a pin on the map.');
    }
  };

  // Uses Places API (New) searchNearby to enrich a real GPS coordinate with a nearby landmark name
  const enrichCoordsWithNearbyPlace = useCallback(
    async (lat: number, lng: number): Promise<string | undefined> => {
      if (!placesLib) return undefined;
      try {
        const { Place } = placesLib as unknown as {
          Place: {
            searchNearby?: (req: Record<string, unknown>) => Promise<{
              places?: Array<{ displayName?: string | null; formattedAddress?: string | null }>;
            }>;
          };
        };
        if (typeof Place?.searchNearby !== 'function') return undefined;
        const res = await Place.searchNearby({
          fields: ['displayName', 'formattedAddress'],
          locationRestriction: {
            center: { lat, lng },
            radius: 250,
          },
          maxResultCount: 1,
        });
        const first = res?.places?.[0];
        if (first?.formattedAddress) return first.formattedAddress;
        if (first?.displayName) return `Near ${first.displayName}`;
      } catch {
        // Non-blocking enrichment; coordinate match handles fallback cleanly
      }
      return undefined;
    },
    [placesLib],
  );

  const handleUseCurrentLocation = () => {
    setStatusError(null);
    setStatusMessage(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusError('Browser geolocation is unavailable on this device. Click anywhere on the map to pin your location.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nearbyHint = await enrichCoordsWithNearbyPlace(lat, lng);
        setGeoLoading(false);
        onPinMove({ lat, lng }, 'geolocation', nearbyHint);
        const match = resolvePhnomPenhLocationFromCoords(lat, lng);
        setStatusMessage(
          match.withinPhnomPenh
            ? `Live GPS locked (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E) · ${match.distanceKm} km from ${match.nearestBranchName}`
            : `Live GPS locked (${lat.toFixed(4)}, ${lng.toFixed(4)}) · Auto-matched to Phnom Penh delivery hub`,
        );
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatusError(
            'Location permission was declined. Allow location access in your browser bar, or click directly on the map to set your drop-off pin.',
          );
        } else if (err.code === err.TIMEOUT) {
          setStatusError('Location request timed out. Please retry or click on the map to place your pin.');
        } else {
          setStatusError('Could not determine your GPS position right now. Click anywhere on the map to drop a pin.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div className="space-y-3">
      {/* Search + Use Current Location Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A5D57]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Phnom Penh street, borey, or pitch..."
            aria-label="Search delivery address on Google Maps"
            className="h-11 w-full border border-[#0E1113]/20 bg-white pl-9 pr-3 text-sm text-[#0E1113] placeholder:text-[#5A5D57]/70 focus:border-[#0E1113] focus:outline-none"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#5A5D57]" />
          )}

          {suggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Address suggestions"
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 border border-[#0E1113]/20 bg-white shadow-lg divide-y divide-[#0E1113]/10"
            >
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#F4F2EC] transition-colors cursor-pointer"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#032EA1]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#0E1113]">
                        {s.mainText}
                      </p>
                      <p className="truncate text-[11px] text-[#5A5D57]">
                        {s.secondaryText}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#0E1113] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#FDFCF9] transition-colors hover:bg-[#032EA1] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {geoLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crosshair className="h-3.5 w-3.5" />
          )}
          <span>{geoLoading ? 'Locating...' : 'Use My Current Location'}</span>
        </button>
      </div>

      {/* Feedback Line */}
      {statusMessage && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#032EA1]">
          <Navigation className="h-3.5 w-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </p>
      )}
      {statusError && (
        <p role="alert" className="text-xs font-medium text-[#C8232C]">
          {statusError}
        </p>
      )}

      {/* Interactive Google Map Canvas */}
      <div className="relative h-[260px] sm:h-[300px] w-full overflow-hidden border border-[#0E1113]/15 bg-[#EAE7DF]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={pinPosition}
          defaultZoom={13}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={(ev) => {
            const latLng = ev.detail?.latLng;
            if (!latLng) return;
            setStatusError(null);
            onPinMove(
              { lat: Number(latLng.lat.toFixed(6)), lng: Number(latLng.lng.toFixed(6)) },
              'map-pin',
            );
            setStatusMessage(
              `Custom delivery pin dropped (${latLng.lat.toFixed(4)}° N, ${latLng.lng.toFixed(4)}° E)`,
            );
          }}
          className="h-full w-full"
        >
          {/* Draggable Customer Delivery Pin */}
          <AdvancedMarker
            position={pinPosition}
            draggable
            title="Your Phnom Penh delivery drop-off pin (drag to adjust)"
            onDragEnd={(ev) => {
              const latLng = ev.latLng;
              if (!latLng) return;
              const lat = Number(latLng.lat().toFixed(6));
              const lng = Number(latLng.lng().toFixed(6));
              onPinMove({ lat, lng }, 'map-pin');
              setStatusMessage(`Delivery pin adjusted (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
            }}
          >
            <Pin
              background="#032EA1"
              borderColor="#FFFFFF"
              glyphColor="#FFFFFF"
              scale={1.15}
            />
          </AdvancedMarker>

          {/* Sport Castle Dispatch Hubs (Reference Pins) */}
          {(Object.entries(BRANCH_COORDINATES) as Array<[string, { lat: number; lng: number }]>).map(
            ([id, pos]) => (
              <AdvancedMarker
                key={id}
                position={pos}
                title={`Sport Castle ${id} dispatch hub`}
              >
                <Pin
                  background="#0E1113"
                  borderColor="#FFFFFF"
                  glyphColor="#B8933B"
                  scale={0.78}
                />
              </AdvancedMarker>
            ),
          )}
        </GoogleMap>

        <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="border border-[#0E1113]/15 bg-[#FDFCF9]/95 px-2.5 py-1 font-mono text-[10px] text-[#0E1113] shadow-sm">
            Click map or drag blue pin to refine exact drop-off
          </span>
          <span className="border border-[#0E1113]/15 bg-[#FDFCF9]/95 px-2.5 py-1 font-mono text-[10px] tabular-nums text-[#0E1113] shadow-sm">
            {pinPosition.lat.toFixed(4)}° N, {pinPosition.lng.toFixed(4)}° E
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Checkout Location Selector with Real Browser Geolocation + Google Maps Platform
 */
export function CheckoutLocationPicker({
  value,
  onLocationSelect,
}: CheckoutLocationPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [pinPosition, setPinPosition] = useState<{ lat: number; lng: number }>(
    value ?? DEFAULT_CENTER,
  );
  const [fallbackGeoLoading, setFallbackGeoLoading] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const matchInfo: PhnomPenhCoordinateMatch = resolvePhnomPenhLocationFromCoords(
    pinPosition.lat,
    pinPosition.lng,
  );

  const handlePinMove = useCallback(
    (
      coords: { lat: number; lng: number },
      source: 'geolocation' | 'map-pin',
      labelHint?: string,
    ) => {
      setPinPosition(coords);
      const resolved = resolvePhnomPenhLocationFromCoords(coords.lat, coords.lng);
      const streetAddress =
        labelHint ||
        (resolved.withinPhnomPenh
          ? `${resolved.landmarkHint} (GPS ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
          : `Pinned GPS Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);

      onLocationSelect({
        lat: coords.lat,
        lng: coords.lng,
        khan: resolved.khan,
        sangkat: resolved.sangkat,
        streetAddress,
        nearestBranchName: resolved.nearestBranchName,
        distanceKm: resolved.distanceKm,
        source,
      });
    },
    [onLocationSelect],
  );

  const handlePlaceChosen = useCallback(
    (loc: SelectedMapLocation) => {
      setPinPosition({ lat: loc.lat, lng: loc.lng });
      onLocationSelect(loc);
    },
    [onLocationSelect],
  );

  const handleFallbackGeolocation = () => {
    setFallbackError(null);
    setFallbackMessage(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setFallbackError('Browser geolocation is unavailable. Select your Khan below.');
      return;
    }
    setFallbackGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFallbackGeoLoading(false);
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        handlePinMove(coords, 'geolocation');
        setFallbackMessage(
          `Current location pinned (${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E)`,
        );
      },
      (err) => {
        setFallbackGeoLoading(false);
        setFallbackError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission declined. Please allow access or enter your address manually.'
            : 'Unable to fetch GPS right now. Please enter your Phnom Penh address below.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div className="border border-[#0E1113]/12 bg-[#F4F2EC]/70 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
            Live Map &amp; Real GPS Delivery Pin
          </p>
          <p className="mt-0.5 text-xs text-[#5A5D57]">
            Allow your current location or search/click the map to auto-fill your Phnom Penh drop-off.
          </p>
        </div>
        <span className="font-mono text-[10.5px] tabular-nums text-[#0E1113]">
          Nearest Hub: {matchInfo.nearestBranchName} ({matchInfo.distanceKm} km)
        </span>
      </div>

      {apiKey ? (
        <APIProvider
          apiKey={apiKey}
          libraries={['marker', 'places']}
          language="en"
          region="KH"
        >
          <InteractiveCheckoutMapInner
            pinPosition={pinPosition}
            onPinMove={handlePinMove}
            onPlaceChosen={handlePlaceChosen}
          />
        </APIProvider>
      ) : (
        <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#5A5D57]">
              <p className="font-semibold text-[#0E1113]">
                Pinned: {matchInfo.khan} · {matchInfo.sangkat}
              </p>
              <p className="font-mono text-[11px] tabular-nums">
                {pinPosition.lat.toFixed(4)}° N, {pinPosition.lng.toFixed(4)}° E
              </p>
            </div>
            <button
              type="button"
              onClick={handleFallbackGeolocation}
              disabled={fallbackGeoLoading}
              className="inline-flex h-10 items-center gap-2 bg-[#0E1113] px-4 font-mono text-xs font-semibold uppercase text-[#FDFCF9] hover:bg-[#032EA1] cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {fallbackGeoLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crosshair className="h-3.5 w-3.5" />
              )}
              <span>Use My Current Location</span>
            </button>
          </div>
          {fallbackMessage && (
            <p className="text-xs font-medium text-[#032EA1]">{fallbackMessage}</p>
          )}
          {fallbackError && (
            <p role="alert" className="text-xs font-medium text-[#C8232C]">
              {fallbackError}
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${pinPosition.lat},${pinPosition.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#032EA1] underline underline-offset-4"
          >
            <span>Verify Pin in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
