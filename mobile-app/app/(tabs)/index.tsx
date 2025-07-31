import React, { useEffect, useState, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { PROVIDER_GOOGLE, Marker, MapViewProps, Region } from 'react-native-maps'
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform,TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import 'react-native-get-random-values';

import { fetchNearbyChurches, PlaceMarker } from '../features/nearbyChurches';

const {height: H} = Dimensions.get('window');

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

  const autocompleteRef = useRef<GooglePlacesAutocomplete>(null);
  const mapRef = useRef<MapView | null>(null);

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
        setMarkers(places);
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
 
    const onRegionChangeComplete = async (r: Region) => {
      setRegion(r);
      try {
        const places = await fetchNearbyChurches(r, apiKey);
        setMarkers(places);
      } catch (e) {
        console.warn(e);
      }
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
            showsCompass
            onRegionChangeComplete={onRegionChangeComplete}
        >
        {markers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
          />
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
    top: Constants.statusBarHeight + 10, // Adjust for status bar height
    alignSelf: 'center',                                // center horizontally
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
});

const s = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, flex: 1, backgroundColor: '#eee' },
  row: { padding: 12, borderBottomWidth: 1, borderColor: '#ddd' },
});