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
          onPress={(data, details = null) => {
            // required callback—even if you don’t need details yet
            console.log('place selected', data, details);
          }}
          query={{
            key: apiKey,
            language: 'en',
          }}
          predefinedPlaces={[]}          // prevents internal .filter() on undefined
          textInputProps={{}}            // supplies the text input config object
          styles={{
            container: { flex: 0 },
            textInputContainer: { width: '100%' },
            textInput: { height: 40, fontSize: 16 },
            listView: { backgroundColor: 'white' },
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
    top: Platform.OS === 'ios' ? H * 0.12 : H * 0.08,  // push down 8–12% of screen height
    alignSelf: 'center',                                // center horizontally
    width: '90%',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    borderColor: "#888",
    borderWidth: 1,
  }
});