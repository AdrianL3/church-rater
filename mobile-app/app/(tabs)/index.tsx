import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { PROVIDER_GOOGLE, Marker, Region, Callout } from 'react-native-maps';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Image, useColorScheme } from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '../../src/auth/amplify';
// @ts-ignore
import churchIcon from '../../assets/images/church.png';
// @ts-ignore
import churchVisitedIcon from '../../assets/images/church-visited.png';
import { fetchNearbyChurches, PlaceMarker } from '../features/nearbyChurches';
import { useRouter } from 'expo-router';
import { DarkTheme, useFocusEffect } from '@react-navigation/native';
import { listVisits } from '../../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || (Constants as any).manifest2?.extra?.googleMapsApiKey;
const Tab = createBottomTabNavigator();
const NO_POI_STYLE = [
  { featureType: 'poi', elementType: 'labels',   stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];


// shape of the visit info we care about
type VisitLite = { rating?: number | null; visitDate?: string | null; notes?: string | null };
type VisitMap = Record<string, VisitLite>; // placeId -> visit

const REGION_KEY = 'lastMapRegion:v1';
let lastRegionMem: Region | null = null;

async function loadLastRegion(): Promise<Region | null> {
  if (lastRegionMem) return lastRegionMem;
  try {
    const raw = await AsyncStorage.getItem(REGION_KEY);
    if (raw) lastRegionMem = JSON.parse(raw);
  } catch {}
  return lastRegionMem;
}

async function saveLastRegion(r: Region) {
  lastRegionMem = r;
  try { await AsyncStorage.setItem(REGION_KEY, JSON.stringify(r)); } catch {}
}


const MapScreen = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);

  // raw places from Google
  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  // merged markers (places + visited flag)
  const [markers, setMarkers] = useState<(PlaceMarker & { visited?: boolean })[]>([]);

  const [visitsMap, setVisitsMap] = useState<VisitMap>({});

  const autocompleteRef = useRef<typeof GooglePlacesAutocomplete>(null);
  const mapRef = useRef<MapView | null>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const colorScheme = useColorScheme();

  // merge helper
  const mergePlacesWithVisits = useCallback(
    (p: PlaceMarker[], vm: VisitMap) =>
      p.map(pl => ({
        ...pl,
        visited: !!vm[pl.id], // true if we have a record for this placeId
      })),
    []
  );

  // load user's visits -> build a quick lookup map
  const loadVisits = useCallback(async () => {
    try {
      const arr = await listVisits(); // [{ userId, placeId, rating, ... }]
      const m: VisitMap = {};
      if (Array.isArray(arr)) {
        for (const v of arr) {
          if (v?.placeId) m[v.placeId] = { rating: v.rating, visitDate: v.visitDate, notes: v.notes };
        }
      }
      setVisitsMap(m);
    } catch (e) {
      // Not signed in or token expired, etc.—just leave visitsMap empty
      console.warn('listVisits failed:', e);
      setVisitsMap({});
    }
  }, []);

  // refetch visits whenever this tab regains focus (after rating)
  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [loadVisits])
  );

  // initial location + initial places
  useEffect(() => {
    (async () => {
      // try saved region first
      const saved = await loadLastRegion();
      if (saved) {
        setRegion(saved);
        setLoading(false);
        // snap immediately so it feels instant
        mapRef.current?.animateToRegion(saved, 0);
      }
  
      // then try to get current location as a fallback for first-time users
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        if (!saved) setLoading(false);
        return;
      }
  
      const current = await Location.getCurrentPositionAsync({});
      const initial: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
  
      // if no saved region, use current location
      if (!saved) {
        setRegion(initial);
        setLoading(false);
        mapRef.current?.animateToRegion(initial, 0);
      }
  
      try {
        const nearby = await fetchNearbyChurches(saved ?? initial, apiKey);
        setPlaces(nearby);
      } catch (e) {
        console.warn('fetchNearbyChurches failed:', e);
      }
  
      // also load visits at startup
      loadVisits();
    })();
  }, [loadVisits]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const saved = await loadLastRegion();
        if (saved && mapRef.current) {
          mapRef.current.animateToRegion(saved, 0);
        }
      })();
      return () => {};
    }, [])
  );

  // whenever places or visitsMap change, recompute markers
  useEffect(() => {
    setMarkers(mergePlacesWithVisits(places, visitsMap));
  }, [places, visitsMap, mergePlacesWithVisits]);

  if (loading || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    void saveLastRegion(r); // save the region to AsyncStorage
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const nearby = await fetchNearbyChurches(r, apiKey);
        setPlaces(nearby);
      } catch (e) {
        console.warn('fetchNearbyChurches failed:', e);
      }
    }, 1000) as unknown as NodeJS.Timeout;
  };

  const handleMarkerPress = (marker: PlaceMarker & { visited?: boolean }) => {
    const zoomRegion: Region = {
      latitude: marker.latitude,
      longitude: marker.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    mapRef.current?.animateToRegion(zoomRegion, 500);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        customMapStyle={NO_POI_STYLE}
        showsCompass
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {markers.map(marker => {
          const pinImage = marker.visited ? churchVisitedIcon : churchIcon;

          return (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              image={pinImage}                          // ← here
              anchor={{ x: 0.5, y: 1 }}
              calloutAnchor={{ x: 0.5, y: 0 }}
              onPress={() => handleMarkerPress(marker)}
            >
              <Callout
                onPress={() => {
                  router.push({
                    pathname: '/(hiddenPage)/detailsPage',
                    params: {
                      placeId: marker.id,
                      title: marker.title,
                      lat: marker.latitude.toString(),
                      lng: marker.longitude.toString(),
                      rating: (marker.rating ?? 0).toString(),
                      visited: (marker.visited ?? false).toString(),
                    },
                  });
                }}
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{marker.title}</Text>
                  <Text>{marker.visited ? '✅ Visited' : '❌ Not visited yet'}</Text>
                  <Text style={{ marginTop: 8, color: '#007AFF', fontWeight: '600' }}>
                    Tap anywhere here for details
                  </Text>
                </View>
              </Callout>
            </Marker>

            
          );
        })}
      </MapView>

      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={autocompleteRef as any}
          placeholder="Type here…"
          query={{ key: apiKey, language: 'en' }}
          fetchDetails
          minLength={1}
          listViewDisplayed
          keyboardShouldPersistTaps="handled"
          textInputProps={{
            autoFocus: false,
            returnKeyType: 'search',
            blurOnSubmit: true,
            placeholderTextColor: DarkTheme ? '#aaa' : '#666', // 👈 dynamic placeholder
          }}
          onPress={(data, details = null) => {
            if (!details?.geometry?.location) return;
            // @ts-ignore
            autocompleteRef.current?.setAddressText(data.description);
            const { lat, lng } = details.geometry.location;
            const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
            mapRef.current?.animateToRegion(newRegion, 500);
          }}
          onFail={err => console.error('Places error:', err)}
          onNotFound={() => console.warn('No results')}
          predefinedPlaces={[]}
          renderRow={row => (
            <View style={styles.row}>
              <Text>{row.description}</Text>
            </View>
          )}
          styles={{
            container: { flex: 0, width: '100%' },
            textInputContainer: { width: '100%', backgroundColor: '#fff' },
            textInput: { height: 40, borderColor: '#888', borderWidth: 1 },
            listView: { backgroundColor: 'white', marginTop: 1 },
          }}
        />
      </View>
    </View>

    
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height - 100 },
  searchContainer: {
    position: 'absolute',
    top: Constants.statusBarHeight + 10,
    alignSelf: 'center',
    width: '90%',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1000,
    zIndex: 9000,
    overflow: 'visible',
    color: DarkTheme ? 'white' : 'black', // 👈 text color
  },
  row: { width: '100%', paddingVertical: 20, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'center' },
  callout: { width: 180, backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center' },
  calloutTitle: { fontWeight: 'bold', marginBottom: 4 },
  ratingButton: { marginTop: 12, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'stretch', alignItems: 'center' },
  ratingButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  legend: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10000,
    borderWidth: 2,
    borderColor: 'red',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: 'contain',
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  
});
