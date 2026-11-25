import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import type { BranchId, BranchInfo } from '../../types/store';
import {
  BRANCH_COORDINATES,
  resolvePhnomPenhLocationFromCoords,
} from '../../utils/orderTracking';

interface BranchCoordinate {
  lat: number;
  lng: number;
}

const BRANCH_POSITIONS: Record<BranchId, BranchCoordinate> = BRANCH_COORDINATES;

const PHNOM_PENH_CENTER: BranchCoordinate = { lat: 11.5621, lng: 104.8885 };

interface NearbyPitchResult {
  id: string;
  name: string;
  address: string;
  position: BranchCoordinate;
}

interface PhnomPenhBranchMapProps {
  branches: BranchInfo[];
  selectedBranchId: BranchId;
  onSelectBranch: (id: BranchId) => void;
  stockCounts: Record<BranchId, number>;
}

function BranchMarkerItem({
  branch,
  position,
  isSelected,
  stockCount,
  onSelect,
}: {
  branch: BranchInfo;
  position: BranchCoordinate;
  isSelected: boolean;
  stockCount: number;
  onSelect: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={branch.name}
        zIndex={isSelected ? 20 : 10}
        onClick={onSelect}
      >
        <Pin
          background={isSelected ? '#C8232C' : '#0E1113'}
          borderColor="#FFFFFF"
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.25 : 1.0}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={260} headerDisabled>
          <div className="p-1 text-[#0E1113]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C8232C]">
              SPORT CASTLE · {branch.shortName}
            </p>
            <p className="mt-0.5 font-display text-sm font-bold text-[#0E1113]">
              {branch.name}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[#5F625C]">
              {branch.address}, {branch.district}
            </p>
            <p className="mt-1.5 font-mono text-[10.5px] font-semibold text-[#0E1113]">
              {branch.hours} · {stockCount} SKUs Ready
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#032EA1] underline underline-offset-2"
            >
              <Navigation className="h-3 w-3" />
              <span>Open Directions in Google Maps</span>
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapCameraSync({
  target,
  onSearchResults,
  onLocateUser,
  locatingUser,
  locationBanner,
}: {
  target: BranchCoordinate;
  onSearchResults: (results: NearbyPitchResult[]) => void;
  onLocateUser: () => void;
  locatingUser: boolean;
  locationBanner: string | null;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!map) return;
    map.panTo(target);
  }, [map, target]);

  const handleFindNearbyPitches = useCallback(async () => {
    if (!placesLib) return;
    setSearching(true);
    setSearchError('');
    try {
      const { Place } = placesLib;
      const response = await Place.searchByText({
        textQuery: 'football pitch stadium Phnom Penh',
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationBias: {
          center: target,
          radius: 5000,
        },
        maxResultCount: 5,
      });

      type PlaceItem = {
        id?: string;
        displayName?: string | null;
        formattedAddress?: string | null;
        location?: { lat: () => number; lng: () => number } | null;
      };
      const rawPlaces: PlaceItem[] = Array.isArray(response?.places)
        ? (response.places as PlaceItem[])
        : [];
      const found: NearbyPitchResult[] = rawPlaces
        .filter((p: PlaceItem): p is PlaceItem & { location: { lat: () => number; lng: () => number } } =>
          Boolean(p.location),
        )
        .map((p, index) => ({
          id: p.id ?? `pitch-${index}`,
          name: p.displayName ?? 'Football Pitch',
          address: p.formattedAddress ?? 'Phnom Penh',
          position: {
            lat: p.location.lat(),
            lng: p.location.lng(),
          },
        }));

      onSearchResults(found);
      if (found.length === 0) {
        setSearchError('No nearby pitches returned in this radius.');
      }
    } catch (err) {
      const msg = String(err);
      setSearchError('Unable to fetch nearby pitches right now.');
    } finally {
      setSearching(false);
    }
  }, [placesLib, target, onSearchResults]);

  return (
    <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={locatingUser}
        onClick={onLocateUser}
        className="inline-flex h-10 items-center gap-1.5 border border-[#0E1113] bg-[#0E1113] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#032EA1] hover:border-[#032EA1] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
      >
        {locatingUser ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Crosshair className="h-3.5 w-3.5" />
        )}
        <span>{locatingUser ? 'Locating...' : 'Use My Current Location'}</span>
      </button>

      <button
        type="button"
        disabled={searching || !placesLib}
        onClick={handleFindNearbyPitches}
        className="inline-flex h-10 items-center gap-1.5 border border-[#0E1113]/20 bg-[#FFFFFF]/95 px-3.5 text-xs font-semibold text-[#0E1113] shadow-sm hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{searching ? 'Searching Pitches...' : 'Find Nearby Pitches'}</span>
      </button>

      {locationBanner && (
        <span className="border border-[#032EA1]/25 bg-[#FFFFFF]/95 px-3 py-1.5 font-mono text-[11px] font-medium text-[#032EA1] shadow-sm">
          {locationBanner}
        </span>
      )}

      {searchError && (
        <span className="border border-[#C8232C]/30 bg-[#FFFFFF]/95 px-2.5 py-1.5 text-[11px] text-[#C8232C] shadow-sm">
          {searchError}
        </span>
      )}
    </div>
  );
}

/**
 * Interactive Google Maps Platform Store Locator for Sport Castle Phnom Penh
 * Uses @vis.gl/react-google-maps with AdvancedMarker, Pin, InfoWindow, Real Geolocation, and Places API (New).
 */
export function PhnomPenhBranchMap({
  branches,
  selectedBranchId,
  onSelectBranch,
  stockCounts,
}: PhnomPenhBranchMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [nearbyPitches, setNearbyPitches] = useState<NearbyPitchResult[]>([]);
  const [userCoords, setUserCoords] = useState<BranchCoordinate | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationBanner, setLocationBanner] = useState<string | null>(null);

  const selectedPosition = useMemo(
    () => BRANCH_POSITIONS[selectedBranchId] ?? PHNOM_PENH_CENTER,
    [selectedBranchId],
  );

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? branches[0];

  const handleLocateUser = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationBanner('Geolocation is unavailable on this browser.');
      return;
    }
    setLocatingUser(true);
    setLocationBanner(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setUserCoords(coords);
        const match = resolvePhnomPenhLocationFromCoords(coords.lat, coords.lng);
        onSelectBranch(match.nearestBranchId);
        setLocationBanner(
          `Closest branch: ${match.nearestBranchName} (${match.distanceKm} km away)`,
        );
      },
      (err) => {
        setLocatingUser(false);
        setLocationBanner(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission declined — select a branch pin manually.'
            : 'Unable to lock your GPS right now.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [onSelectBranch]);

  if (!apiKey) return null;

  return (
    <div className="relative h-[380px] sm:h-[440px] w-full overflow-hidden border border-[#0E1113]/12 bg-[#EAE7DF]">
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'places']}
        language="en"
        region="KH"
      >
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={PHNOM_PENH_CENTER}
          defaultZoom={12}
          gestureHandling="cooperative"
          mapTypeControl={false}
          streetViewControl={false}
          className="h-full w-full"
        >
          <MapCameraSync
            target={userCoords ?? selectedPosition}
            onSearchResults={setNearbyPitches}
            onLocateUser={handleLocateUser}
            locatingUser={locatingUser}
            locationBanner={locationBanner}
          />

          {userCoords && (
            <AdvancedMarker
              position={userCoords}
              title="Your current location"
              zIndex={30}
            >
              <Pin
                background="#032EA1"
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={1.1}
              />
            </AdvancedMarker>
          )}

          {branches.map((branch) => (
            <BranchMarkerItem
              key={branch.id}
              branch={branch}
              position={BRANCH_POSITIONS[branch.id]}
              isSelected={branch.id === selectedBranchId}
              stockCount={stockCounts[branch.id] ?? 0}
              onSelect={() => onSelectBranch(branch.id)}
            />
          ))}

          {nearbyPitches.map((pitch) => (
            <AdvancedMarker
              key={pitch.id}
              position={pitch.position}
              title={`${pitch.name} — ${pitch.address}`}
            >
              <Pin
                background="#B8933B"
                borderColor="#FFFFFF"
                glyphColor="#0E1113"
                scale={0.85}
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
