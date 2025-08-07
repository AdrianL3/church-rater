import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function AddEditScreen() {
  const router = useRouter();
  const { placeId, title, lat, lng, rating, visited } =
    useLocalSearchParams<{
      placeId: string;
      title: string;
      lat: string;
      lng: string;
      rating: string;
      visited: string;
    }>();

  const [newRating, setNewRating] = useState(rating ?? "");

  const save = () => {
    // TODO: call your backend to save newRating/visited
    Alert.alert("Saved!", `You rated ${title} as ${newRating}`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rate {title}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={newRating}
        onChangeText={setNewRating}
      />
      <Button title="Save" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", paddingTop: 100 },
  label: { 
    fontSize: 18, 
    marginBottom: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 16,
    borderRadius: 4,
  },
});
