import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const Tab = createBottomTabNavigator();


const MapScreen = () => {
  return (
    <View style={styles.container}>
      <MapView style={styles.map} provider={PROVIDER_GOOGLE}/>
    </View>
  );
};
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

// const MapScreen = () => {
//   return (
//     <div>
//       <h1>Add/Edit Screen</h1>
//     </div>
//   );
// };

export default MapTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    margin: 10,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
});