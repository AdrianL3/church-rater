import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import 'react-native-get-random-values';

const {height: H} = Dimensions.get('window');

const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || '';
// Ensure that the apiKey is defined
console.log('Google Maps API Key:', apiKey);

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

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });

      setLoading(false);
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
  // END: add-centered-style

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      />
      <View style={styles.searchContainer}>
      <GooglePlacesAutocomplete
        placeholder="Search"
        fetchDetails={false}
        onPress={(data, details = null) => console.log(data, details)}
        query={{ key: apiKey, language: 'en' }}
        nearbyPlacesAPI="GooglePlacesSearch"
        debounce={200}

        // ← required to avoid that `.filter` error:
        predefinedPlaces={[]}
        predefinedPlacesAlwaysVisible={false}

        // ← ensures textInputProps is never undefined:
        textInputProps={{}}


        styles={{
          // 👇 _all_ of these slots must be defined:
          container: {
            flex: 0,
            position: 'absolute',
            top: 0,
            width: '100%',
            zIndex: 9999,
            overflow: 'visible',
          },
          textInputContainer: {
            width: '100%',
            backgroundColor: 'white',
          },
          textInput: {
            height: 40,
            borderColor: '#888',
            borderWidth: 1,
            borderRadius: 4,
            paddingHorizontal: 8,
            fontSize: 16,
          },
          listView: {
            width: '100%',
            backgroundColor: 'white',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
          },

          row: {},
          separator: {},
          description: {},
          loader: {},
          powered: {},
          poweredContainer: {},
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
  }
});