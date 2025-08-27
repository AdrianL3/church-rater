// app/(hiddenPage)/addEdit.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Keyboard, InputAccessoryView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Constants from 'expo-constants';
import { getVisit, upsertVisit, getUploadUrl } from '../../src/api';

// Local helper to format date in local time (avoids off-by-one from timezone)
const toYMD = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const IOS_ACCESSORY_ID = 'addEditDoneBar';

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

  const apiKey = (Constants.expoConfig?.extra as any)?.googleMapsApiKey ?? '';

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

  // Fetch the official place name from Google Places
  const fetchPlaceName = async (pid: string): Promise<string | null> => {
    try {
      if (!apiKey || !pid) return null;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(pid)}&fields=name&key=${apiKey}`
      );
      const json = await res.json();
      if (json.status === 'OK' && json.result?.name) {
        return String(json.result.name);
      }
      return null;
    } catch {
      return null;
    }
  };

  const addPhoto = async () => {
    try {
      setUploading(true);

      // Request permission + open iOS Photo Picker with multi-select
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Media library permission denied');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,   // iOS multi-select
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

  const save = async () => {
    Keyboard.dismiss(); // hide keyboard before saving
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

      // Always try to fetch the authoritative name here
      let placeName: string | null = await fetchPlaceName(String(placeId));
      // Fallback to the `title` passed from the map/details if API fails
      if (!placeName && title) placeName = String(title);

      await upsertVisit(String(placeId), {
        rating: num,
        notes,
        visitDate,
        imageKeys,
        placeName: placeName ?? null, // ← store the name
      });

      Alert.alert('Saved', 'Your visit has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {/* ScrollView allows swipe-down to dismiss on iOS */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{title ? `Rate ${title}` : 'Rate this church'}</Text>

        <Text style={styles.label}>Rating (0–5)</Text>
        <TextInput
          value={rating}
          onChangeText={setRating}
          keyboardType="numeric"
          placeholder="4"
          style={styles.input}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => Keyboard.dismiss()}
          {...(Platform.OS === 'ios' ? { inputAccessoryViewID: IOS_ACCESSORY_ID } : {})}
        />

        <Text style={styles.label}>Visit Date</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setDatePickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dateValue}>{visitDate}</Text>
          <Text style={styles.dateChange}>Change</Text>
        </TouchableOpacity>

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
          display="inline"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="What stood out to you?"
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => Keyboard.dismiss()}
          {...(Platform.OS === 'ios' ? { inputAccessoryViewID: IOS_ACCESSORY_ID } : {})}
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

        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={save}
          disabled={saving || uploading}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.ghost]}
          onPress={() => { Keyboard.dismiss(); router.back(); }}
          disabled={saving || uploading}
        >
          <Text style={[styles.buttonText, { color: '#007AFF' }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* iOS-only Done bar above the keyboard */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={IOS_ACCESSORY_ID}>
          <View style={styles.accessory}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.accessoryBtn}>
              <Text style={styles.accessoryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#fff', padding: 16, gap: 12, paddingTop: 100, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa',
  },

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

  // iOS accessory bar
  accessory: {
    backgroundColor: '#f2f2f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  accessoryText: { color: 'white', fontWeight: '700' },
});
