import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

const YourListsTab = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="YourLists" 
        component={YourListsScreen} 
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
};

const YourListsScreen = () => {
  return (
    <div>
      <h1>Add/Edit Screen</h1>
    </div>
  );
};

export default YourListsTab;
