// app/(hiddenPage)/addEdit.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { getVisit, upsertVisit, getUploadUrl } from '../../src/api';

// Local helper to format date in local time (avoids off-by-one from timezone)
const toYMD = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function AddEdit() {
  const router = useRouter();
  const { placeId, title } = useLocalSearchParams<{ placeId: string; title?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [rating, setRating] = useState<string>('');                 
  const [visitDate, setVisitDate] = useState<string>(toYMD(new Date())); // YYYY-MM-DD
  const [notes, setNotes] = useState<string>('');
  const [imageKeys, setImageKeys] = useState<string[]>([]);

  // date picker modal state
  const [datePickerVisible, setDatePickerVisible] = useState(false);

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
  
      // Request permission + open iOS Photo Picker with multi-select
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Media library permission denied');
  
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,   // 👈 iOS multi-select
        quality: 1,
      });
  
      if (picked.canceled || !picked.assets?.length) return;
  
      // Resize → upload each selected image
      for (const a of picked.assets) {
        const manipulated = await ImageManipulator.manipulateAsync(
          a.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
  
        const { uploadUrl, key } = await getUploadUrl(String(placeId));
        const blob = await (await fetch(manipulated.uri)).blob();
  
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  
        setImageKeys(prev => [...prev, key]);
      }
  
      Alert.alert('Photos added', `Uploaded ${picked.assets.length} photo(s).`);
    } catch (e: any) {
      Alert.alert('Upload error', e?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };
  
  // helper: resize → upload each → append keys
  const uploadAssets = async (uris: string[]) => {
    for (const uri of uris) {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
  
      const { uploadUrl, key } = await getUploadUrl(String(placeId));
      const blob = await (await fetch(manipulated.uri)).blob();
  
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  
      setImageKeys(prev => [...prev, key]);
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

        <Text style={styles.label}>Visit Date</Text>

        {/* Tappable date field to open the calendar */}
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setDatePickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateValue}>{visitDate}</Text>
          <Text style={styles.dateChange}>Change</Text>
        </TouchableOpacity>

        {/* Calendar modal */}
        <DateTimePickerModal
          isVisible={datePickerVisible}
          mode="date"
          date={new Date(visitDate)}
          maximumDate={new Date()}
          onConfirm={(d) => {
            setVisitDate(toYMD(d));
            setDatePickerVisible(false);
          }}
          onCancel={() => setDatePickerVisible(false)}
          // iOS only style; Android ignores it gracefully:
          display="inline"
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
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={addPhoto}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>{uploading ? 'Uploading…' : 'Add Photos'}</Text>
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

  // date field styles
  dateField: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  dateValue: { fontSize: 16, color: '#333' },
  dateChange: { fontSize: 14, color: '#007AFF', fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  button: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  primary: { backgroundColor: '#007AFF' },
  secondary: { backgroundColor: '#eee' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
