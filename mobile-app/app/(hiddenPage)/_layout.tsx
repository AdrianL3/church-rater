// app/(hiddenPage)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function HiddenLayout() {
  return (
    <Stack>

        <Stack.Screen
          name="addEdit"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="detailsPage"
          options={{ headerShown: false }}
        />
      </Stack>
    
  );
}
