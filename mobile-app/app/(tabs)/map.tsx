import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

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

const MapScreen = () => {
  return (
    <div>
      <h1>Add/Edit Screen</h1>
    </div>
  );
};

export default MapTab;
