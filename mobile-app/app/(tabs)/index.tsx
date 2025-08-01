import React, { useEffect, useState, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { PROVIDER_GOOGLE, Marker, MapViewProps, Region } from 'react-native-maps'
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform, TouchableOpacity, Button } from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
//ts-ignore-next-line
import churchIcon from '../../assets/images/church.png'; // Ensure you have a church icon image in your assets

import { fetchNearbyChurches, PlaceMarker } from '../features/nearbyChurches';
import { useNavigation, useRouter } from 'expo-router';
import { Callout } from 'react-native-maps';

const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || '';
// Ensure that the apiKey is defined
//console.log('Google Maps API Key:', apiKey);

const Tab = createBottomTabNavigator();


const MapScreen = () => {
  // Request location permissions
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<PlaceMarker[]>([]);

  const autocompleteRef = useRef<typeof GooglePlacesAutocomplete>(null); // FIXED: Changed to typeof
  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    (async () => {
      // Ask for location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const initial: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      setRegion(initial);

      setLoading(false);

      try {
        const places = await fetchNearbyChurches(initial, apiKey);
        setMarkers(places.map(p => ({ ...p, rating: p.rating ?? 0, visited: p.visited ?? false })));
        // setMarkers(places);
      } catch (e) {
        console.warn(e);
      }


    })();
  }, []);

    if (loading || !region) {
      return (
        <View style={styles.centered}>
          {/* BEGIN: add-centered-style */}
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
 
    const onRegionChangeComplete = (r: Region) => {
      setRegion(r)
  
      // clear any pending fetch
      if (debounceRef.current) clearTimeout(debounceRef.current)
  
      // schedule a new fetch in 500ms
      debounceRef.current = setTimeout(async () => {
        const places = await fetchNearbyChurches(r, apiKey)
        setMarkers(places)
      }, 500) as unknown as NodeJS.Timeout; // FIXED: Cast to NodeJS.Timeout
    }

    const handleMarkerPress = (marker: PlaceMarker) => {
      // Handle marker press event
      console.log('Marker pressed:', marker);
      const zoomRegion: Region = {
        latitude: marker.latitude,
        longitude: marker.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      mapRef.current?.animateToRegion(zoomRegion, 500);
    }

  return (
    <View style={styles.container}>
      <MapView 
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            style={styles.map}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            onRegionChangeComplete={onRegionChangeComplete}
        >
        {markers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            onPress={() => handleMarkerPress(marker)}
            image={churchIcon}
          >
            {/* Remove tooltip so default callout (with built-in press) works */}
            <Callout
              onPress={() => {
                console.log('⭐ Callout pressed for marker:', marker.id);
                router.push({ pathname: '/addEdit', params: { markerId: marker.id } });
              }}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.title}</Text>
                <Text>Rating: {marker.rating?.toFixed(1) || 'N/A'}</Text>
                <Text>{marker.visited ? '✅ Visited' : '❌ Not visited yet'}</Text>
          
                {/* You can still render your styled box, but it won’t try to intercept touches */}
                <View style={styles.ratingButton}>
                  <Text style={styles.ratingButtonText}>
                    {marker.rating ? 'Edit Rating' : 'Add Rating'}
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
        
        {/* Optional: Add a marker for the user's current location */}
      </MapView>
      
      
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={autocompleteRef}

          placeholder="Type here…"
          query={{ key: apiKey, language: 'en' }}
          fetchDetails={true}

          /*** override minLength so it fires on 1 character ***/
          minLength={1}

          /*** force the list to display on every keystroke ***/
          listViewDisplayed={true}
          keyboardShouldPersistTaps='always'

          /*** confirm you’re actually typing ***/
          textInputProps={{
            autoFocus: true,
            //onChangeText: text => console.log('INPUT TEXT:', text),
          }}

          onPress={(data, details = null) => {
            if (!details?.geometry?.location) return;
            
            // fill the search bar:
            autocompleteRef.current?.setAddressText(data.description);
            
            // pull coords out of details:
            const { lat: latitude, lng: longitude } = details.geometry.location;
            const newRegion = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
            
            // animate the MapView (not the autocomplete):
            mapRef.current?.animateToRegion(newRegion, 500);
          }}

          onFail={err => console.error('Places error:', err)}
          onNotFound={() => console.warn('No results')}
          predefinedPlaces={[]}

          /*** hook into each row so we know it’s rendering ***/
          renderRow={row => {
            //console.log('ROW DATA:', row);
            return (
              <View style={styles.row}>
                <Text>{row.description}</Text>
              </View>
            );
          }}
        

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

//onregionChange function returns the lat and long when users scroll through the map
//i can use this to create a lambda function that will return markers for all the nearby churches
//handle markers press event onPress

const MapTab = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
};

export default MapTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    margin: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
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
    zIndex: 9000, // Ensure it appears above the map
    overflow: 'visible', // Allow children to overflow
  },
  input: {
    borderColor: "#888",
    borderWidth: 1,
  },
  row: {
    width: '100%',           // full width
    paddingVertical: 20,     // tall touch target
    paddingHorizontal: 15,   // side padding
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'center',
  },
  callout: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'stretch',      // makes it full-width inside the callout
    alignItems: 'center',
  },
  ratingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const s = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, flex: 1, backgroundColor: '#eee' },
  row: { padding: 12, borderBottomWidth: 1, borderColor: '#ddd' },
});