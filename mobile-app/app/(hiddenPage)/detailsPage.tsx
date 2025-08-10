import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Alert, Image, TouchableOpacity, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { getVisit } from '../../src/api';

export default function DetailsPage() {
  const { placeId, title, lat, lng, rating: ratingParam, visited: visitedParam } =
    useLocalSearchParams<{ placeId: string; title: string; lat: string; lng: string; rating?: string; visited?: string }>();

  const [address, setAddress] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [website, setWebsite] = useState<string | null>(null);
  const [visit, setVisit] = useState<any>(null);

  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

  // 1) Google details (address/photo/website)
  useEffect(() => {
    if (!placeId) return;
    (async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_address,photos,website&key=${apiKey}`
        );
        const json = await res.json();
        if (json.status !== 'OK') throw new Error(json.error_message || json.status);
        const result = json.result;
        setAddress(result.formatted_address);
        setWebsite(result.website ?? null);
        if (result.photos?.length) {
          const ref = result.photos[0].photo_reference;
          setPhotoUrl(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ref}&key=${apiKey}`);
        }
      } catch (e: any) {
        console.warn('Place details error:', e);
        Alert.alert('Error', e.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId]);

  // 2) Backend visit (rating/notes/date/images)
  useEffect(() => {
    if (!placeId) return;
    (async () => {
      try {
        const v = await getVisit(String(placeId));
        setVisit(v && Object.keys(v).length ? v : null);
      } catch (e) {
        console.warn('getVisit failed', e);
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

  // Prefer backend values; fall back to params if present
  const backendRating = visit?.rating as number | undefined;
  const backendNotes = (visit?.notes as string | undefined) ?? '';
  const backendVisitDate = visit?.visitDate as string | undefined;
  const imageKeys: string[] = Array.isArray(visit?.imageKeys) ? visit.imageKeys : [];

  // If user has a rating or a visitDate, consider it visited
  const isVisited = !!(backendVisitDate || (typeof backendRating === 'number' && !Number.isNaN(backendRating)));

  const ratingToShow = backendRating ?? (ratingParam ? Number(ratingParam) : undefined);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} />}

      <Text style={styles.header}>{title || 'Church Details'}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{address}</Text>
      </View>

      {website ? (
        <View style={styles.field}>
          <Text style={styles.label}>Website:</Text>
          <TouchableOpacity onPress={() => Linking.openURL(website)}>
            <Text style={[styles.value, { color: 'blue' }]}>{website}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Visited:</Text>
        <Text style={styles.value}>{isVisited ? '✅ Yes' : '❌ No'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Rating:</Text>
        <Text style={styles.value}>{ratingToShow ?? 'N/A'}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes:</Text>
        <Text style={styles.value}>
          {isVisited ? backendNotes || '—' : 'No notes available.'}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>User Images:</Text>
        {isVisited ? (
          imageKeys.length ? (
            // simple placeholder list; swap for thumbnails later
            <>
              {imageKeys.map((k) => (
                <Text key={k} style={styles.value}>• {k.split('/').pop()}</Text>
              ))}
            </>
          ) : (
            <Text style={styles.value}>No images uploaded yet.</Text>
          )
        ) : (
          <Text style={styles.value}>Rate to add images</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.rateButton}
        onPress={() =>
          router.push({
            // if this screen lives under (hiddenPage), use '/(hiddenPage)/addEdit'
            pathname: '/(hiddenPage)/addEdit',
            params: { placeId, title, lat, lng },
          })
        }
      >
        <Text style={styles.backButtonText}>{isVisited ? 'Edit' : 'Rate'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  container: { padding: 16, backgroundColor: '#fff', paddingTop: 100 },
  photo: { width: '100%', height: 200, borderRadius: 8, marginBottom: 16 },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  field: { marginBottom: 16, padding: 5 },
  label: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 16, color: '#333' },
  backButton: { marginTop: 24, alignSelf: 'center', backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16 },
  rateButton: { marginTop: 24, alignSelf: 'center', backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
