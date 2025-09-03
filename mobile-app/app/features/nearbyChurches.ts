// src/utils/placesApi.ts
import { Region } from 'react-native-maps';

export interface PlaceMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  rating?: number;
  visited?: boolean;
}

/**
 * Fetches nearby Catholic churches using Google’s Places Nearby Search.
 * @param region - The map region (center + deltas).
 * @param apiKey - Your Google Maps API key.
 * @param radius - Search radius in meters (defaults to 5 km).
 */
export async function fetchNearbyChurches(
  region: Region,
  apiKey: string,
  radius: number = 5000
): Promise<PlaceMarker[]> {
  const { latitude, longitude } = region;
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${latitude},${longitude}` +
    `&radius=${radius}` +
    `&type=church` +
    `&keyword=catholic` +
    `&key=${apiKey}`;

  const response = await fetch(url);
  const json = await response.json();

  if (json.status !== 'OK') {
    throw new Error(`Places API error: ${json.status} – ${json.error_message || ''}`);
  }

  return json.results.map((place: any) => ({
    id: place.place_id,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    title: place.name,
  }));
}

//default export
export default fetchNearbyChurches;