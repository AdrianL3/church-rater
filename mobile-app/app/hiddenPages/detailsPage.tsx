import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';

export default function DetailsPage() {
  const { placeId, title, lat, lng, rating, visited } = useLocalSearchParams<{
    placeId: string;
    title: string;
    lat: string;
    lng: string;
    rating: string;
    visited: string;
  }>();

  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  useEffect(() => {
    if (!placeId) return;
    (async () => {
      try {
        // Use Place Details endpoint to get formatted_address directly
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
            `&fields=name,rating,formatted_address` +
            `&key=${apiKey}`
        );
        const json = await res.json();
        console.log('Place Details JSON:', json);
        if (json.status !== 'OK') {
          throw new Error(json.error_message || json.status);
        }
        setAddress(json.result.formatted_address);
      } catch (e: any) {
        console.warn('DetailsPage error:', e);
        Alert.alert('Error', e.message || 'Failed to load address');
        setAddress('Address not available');
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>{title || 'Church Details'}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Place ID:</Text>
        <Text style={styles.value}>{placeId}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{address}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Coordinates:</Text>
        <Text style={styles.value}>{lat}, {lng}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Rating:</Text>
        <Text style={styles.value}>{rating || 'N/A'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Visited:</Text>
        <Text style={styles.value}>{visited === 'true' ? '✅ Yes' : '❌ No'}</Text>
      </View>

      {/* TODO: Add more fields here: opening hours, photos, user notes, etc. */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
});
