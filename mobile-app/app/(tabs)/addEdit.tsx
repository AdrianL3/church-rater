import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

const AddEditTab = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="AddEdit" 
        component={AddEditScreen} 
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
};

const AddEditScreen = () => {
  return (
    <div>
      <h1>Add/Edit Screen</h1>
    </div>
  );
};

export default AddEditTab;
