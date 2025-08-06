import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Alert, Image, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';


export const options = {
  headerShown: false,
};

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  useEffect(() => {
    if (!placeId) return;
    (async () => {
      try {
        // Request place details including photos
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
            `&fields=name,rating,formatted_address,photos` +
            `&key=${apiKey}`
        );
        const json = await res.json();
        if (json.status !== 'OK') {
          throw new Error(json.error_message || json.status);
        }
        const result = json.result;
        setAddress(result.formatted_address);
        // Grab first photo reference if available
        if (result.photos && result.photos.length > 0) {
          const ref = result.photos[0].photo_reference;
          const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ref}&key=${apiKey}`;
          setPhotoUrl(url);
        }
      } catch (e: any) {
        console.warn('DetailsPage error:', e);
        Alert.alert('Error', e.message || 'Failed to load details');
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
      {photoUrl && (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      )}
      <Text style={styles.header}>{title || 'Church Details'}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{address}</Text>
      </View>

    {/* change this so that it connects to my backend */}
      <View style={styles.field}>
        <Text style={styles.label}>Rating:</Text>
        <Text style={styles.value}>{rating || 'N/A'}</Text>
      </View>

    {/* change this so that it connects to my backend */}
      <View style={styles.field}>
        <Text style={styles.label}>Visited:</Text>
          <Text style={styles.value}>{visited === 'true' ? '✅ Yes' : '❌ No'}</Text>
        </View>

        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => {
              router.push({ pathname: "/addEdit", params: { placeId, title, lat, lng, rating, visited } });
            }}
              >
                  <Text style={styles.backButtonText}>Rate</Text>
              </TouchableOpacity>


              <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    router.back();
                  }}
        >
            <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      {/* Add more details below HERE */}

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
    paddingTop: 100, // Adjust for header height
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
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
  backButton: {
    marginTop: 24,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  rateButton: {
    marginTop: 24,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
