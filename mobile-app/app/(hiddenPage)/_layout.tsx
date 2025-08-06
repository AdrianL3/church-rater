// app/(hiddenPage)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function HiddenLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        header: () => null,
        presentation: 'fullScreenModal'
      }}
    >
        <Stack.Screen name="addEdit" />
        <Stack.Screen name="detailsPage" />
      </Stack>
  );
}
