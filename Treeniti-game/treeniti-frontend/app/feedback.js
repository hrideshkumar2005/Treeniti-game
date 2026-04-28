import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

export default function Feedback() {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please write something before submitting.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/admin/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: feedback })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Thank you!", "Your feedback has been submitted successfully.");
        setFeedback('');
        router.back();
      } else {
        Alert.alert("Error", data.error || "Submission failed.");
      }
    } catch (e) {
      Alert.alert("Error", "Server not reachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback & Complaints</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.label}>Tell us what's on your mind</Text>
            <Text style={styles.subLabel}>Report bugs, suggest features, or complain about issues. We listen to everything!</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Write your feedback here..."
              multiline
              numberOfLines={6}
              value={feedback}
              onChangeText={setFeedback}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { backgroundColor: '#A5D6A7' }]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? "Submitting..." : "Submit Feedback"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Your feedback helps us make Treeniti better for everyone. Please be as descriptive as possible.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subLabel: { fontSize: 13, color: '#666', marginBottom: 20 },
  input: {
    backgroundColor: '#F9FDF9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    padding: 15,
    fontSize: 14,
    color: '#333',
    minHeight: 150,
    marginBottom: 20
  },
  submitBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center'
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    alignItems: 'center'
  },
  infoText: { flex: 1, fontSize: 12, color: '#4E6E4E', marginLeft: 10, lineHeight: 18 }
});
