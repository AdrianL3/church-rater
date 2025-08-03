import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

const AddEditScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add/Edit Screen</Text>
    </View>
  );
};

//need to make this a tab so that it can be used in the main app
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

export default AddEditTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
