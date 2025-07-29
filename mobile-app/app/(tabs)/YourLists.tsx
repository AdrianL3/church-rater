import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

const YourListsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Lists Screen</Text>
    </View>
  );
};

const YourListsTab = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Your Lists" 
        component={YourListsScreen} 
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
};

export default YourListsTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
  },
});
