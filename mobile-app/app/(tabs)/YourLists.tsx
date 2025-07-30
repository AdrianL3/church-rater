// import React from 'react';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { View, Text, StyleSheet } from 'react-native';

// const Tab = createBottomTabNavigator();

// const YourListsScreen = () => {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Your Lists Screen</Text>
//     </View>
//   );
// };

// const YourListsTab = () => {
//   return (
//     <Tab.Navigator>
//       <Tab.Screen 
//         name="Your Lists" 
//         component={YourListsScreen} 
//         options={{ headerShown: false }} 
//       />
//     </Tab.Navigator>
//   );
// };

// export default YourListsTab;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 24,
//   },
// });
import 'react-native-get-random-values';
import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

const apiKey = "AIzaSyCX7Qzzpp02i2Xn5Xf32FPM8c6J_SQlCEs";

export default function TestAutoComplete() {
  const ref = useRef<GooglePlacesAutocomplete>(null);

  // (optional) auto‑focus on mount so we don’t have to tap
  useEffect(() => {
    setTimeout(() => ref.current?.props.textInputProps?.onFocus?.(), 200);
  }, []);

  return (
    <View style={s.container}>
      <GooglePlacesAutocomplete
        ref={ref}

        placeholder="Type here…"
        query={{ key: apiKey, language: 'en' }}
        fetchDetails={false}

        /*** override minLength so it fires on 1 character ***/
        minLength={1}

        /*** force the list to display on every keystroke ***/
        listViewDisplayed={true}

        /*** confirm you’re actually typing ***/
        textInputProps={{
          autoFocus: true,
          onChangeText: text => console.log('INPUT TEXT:', text),
        }}

        onPress={(data) => {
          console.log('SELECTED:', data.description)
          ref.current?.setAddressText(data.description) // Changed autoRef to ref
        }}
        onFail={err => console.error('Places error:', err)}
        onNotFound={() => console.warn('No results')}
        predefinedPlaces={[]}

        /*** hook into each row so we know it’s rendering ***/
        renderRow={row => {
          console.log('ROW DATA:', row);
          return (
            <View style={s.row}>
              <Text>{row.description}</Text>
            </View>
          );
        }}

        styles={{
          container: { flex: 0, width: '100%' },
          textInputContainer: { width: '100%', backgroundColor: '#fff' },
          textInput: { height: 40, borderColor: '#888', borderWidth: 1 },
          listView: { backgroundColor: 'white', marginTop: 4 },
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, flex: 1, backgroundColor: '#eee' },
  row: { padding: 12, borderBottomWidth: 1, borderColor: '#ddd' },
});
