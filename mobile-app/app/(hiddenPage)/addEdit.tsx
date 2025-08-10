// app/(hiddenPage)/addEdit.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getVisit, upsertVisit, getUploadUrl } from '../../src/api';

export default function AddEdit() {
  const router = useRouter();
  const { placeId, title } = useLocalSearchParams<{ placeId: string; title?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [rating, setRating] = useState<string>('');                 // "4"
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [notes, setNotes] = useState<string>('');
  const [imageKeys, setImageKeys] = useState<string[]>([]);

  // Prefill from backend if a visit already exists
  useEffect(() => {
    (async () => {
      try {
        if (!placeId) return;
        const v = await getVisit(String(placeId));
        if (v && Object.keys(v).length) {
          if (typeof v.rating === 'number') setRating(String(v.rating));
          if (typeof v.visitDate === 'string') setVisitDate(v.visitDate);
          if (typeof v.notes === 'string') setNotes(v.notes);
          if (Array.isArray(v.imageKeys)) setImageKeys(v.imageKeys);
        }
      } catch (e: any) {
        console.warn('prefill getVisit failed', e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId]);

  const addPhoto = async () => {
    try {
      setUploading(true);

      // 1) ask permission + pick one image
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Media library permission denied');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (picked.canceled || !picked.assets?.length) return;

      // 2) normalize to JPEG and a reasonable size
      const manipulated = await ImageManipulator.manipulateAsync(
        picked.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 3) get presigned PUT url from backend
      const { uploadUrl, key } = await getUploadUrl(String(placeId));

      // 4) upload binary to S3
      const blob = await (await fetch(manipulated.uri)).blob();
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      // 5) keep the key locally; it’ll be saved on "Save"
      setImageKeys(prev => [...prev, key]);
      Alert.alert('Photo added', 'Image uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Upload error', e?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!placeId) {
      Alert.alert('Missing place', 'No placeId provided.');
      return;
    }
    const num = Number(rating);
    if (Number.isNaN(num) || num < 0 || num > 5) {
      Alert.alert('Invalid rating', 'Please enter a rating between 0 and 5.');
      return;
    }

    try {
      setSaving(true);
      await upsertVisit(String(placeId), {
        rating: num,
        notes,
        visitDate,
        imageKeys,
      });
      Alert.alert('Saved', 'Your visit has been saved.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save your visit.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{title ? `Rate ${title}` : 'Rate this church'}</Text>

        <Text style={styles.label}>Rating (0–5)</Text>
        <TextInput
          value={rating}
          onChangeText={setRating}
          keyboardType="numeric"
          placeholder="4"
          style={styles.input}
        />

        <Text style={styles.label}>Visit Date (YYYY-MM-DD)</Text>
        <TextInput
          value={visitDate}
          onChangeText={setVisitDate}
          placeholder="2025-08-10"
          style={styles.input}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="What stood out to you?"
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          multiline
        />

        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={addPhoto} disabled={uploading}>
            <Text style={styles.buttonText}>{uploading ? 'Uploading…' : 'Add Photo'}</Text>
          </TouchableOpacity>
          <Text style={{ marginLeft: 12 }}>({imageKeys.length} uploaded)</Text>
        </View>

        <TouchableOpacity style={[styles.button, styles.primary]} onPress={save} disabled={saving || uploading}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.ghost]} onPress={() => router.back()} disabled={saving || uploading}>
          <Text style={[styles.buttonText, { color: '#007AFF' }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 12, paddingTop: 100 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  button: {
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 12,
  },
  primary: { backgroundColor: '#007AFF' },
  secondary: { backgroundColor: '#eee' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
