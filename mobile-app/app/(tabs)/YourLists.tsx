import 'react-native-get-random-values';
import React, { useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || '';

export default function TestAutoComplete() {
  // 1️⃣ Create your ref inside the component
  const ref = useRef<GooglePlacesAutocomplete>(null);

  return (
    <View style={s.container}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Type here…"
        query={{ key: apiKey, language: 'en' }}
        fetchDetails={false}
        minLength={1}
        listViewDisplayed={true}
        
        // 2️⃣ Auto‑focus the keyboard; no need for a useEffect
        textInputProps={{ autoFocus: true }}

        // 3️⃣ When the user taps an item, fill the bar
        onPress={(data) => {
          console.log('SELECTED:', data.description);
          ref.current?.setAddressText(data.description);
        }}

        onFail={err => console.error('Places error:', err)}
        onNotFound={() => console.warn('No results')}
        predefinedPlaces={[]}

        styles={{
          container: { flex: 0, width: '100%' },
          textInputContainer: { backgroundColor: '#fff', borderRadius: 4, marginBottom: 4 },
          textInput: { height: 40, borderColor: '#888', borderWidth: 1, paddingHorizontal: 8 },
          listView: { backgroundColor: 'white' },
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, flex: 1, backgroundColor: '#eee' },
});
