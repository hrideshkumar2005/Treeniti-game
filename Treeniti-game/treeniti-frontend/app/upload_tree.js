import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');

export default function UploadTree() {
  const router = useRouter();
  const [images, setImages] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [treeId, setTreeId] = useState(null);
  const [treeName, setTreeName] = useState('');
  const [loading, setLoading] = useState(false);

  const allowedDays = [1, 7, 15, 30];

  // Fetch user's first tree to use as default
  useFocusEffect(useCallback(() => {
    const fetchTree = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/tree`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.trees.length > 0) {
          const activeTree = data.trees[0];
          setTreeId(activeTree._id);
          setTreeName(activeTree.treeName);
        }
      } catch (e) {}
    };
    fetchTree();
  }, []));

  const pickImages = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow gallery access to upload photos of your tree.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 3 - images.length,
      });

      if (!result.canceled && result.assets) {
        setImages(prev => [...prev, ...result.assets].slice(0, 3));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo of your tree.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, 
        quality: 0.7,
      });

      if (!result.canceled) {
        const imageUri = result.assets ? result.assets[0].uri : result.uri;
        if (imageUri) {
          console.log("📸 Image URI:", imageUri);
          setImages(prev => [...prev, { uri: imageUri }].slice(0, 3));
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const handleUpload = async () => {
    if (!treeId) {
      Alert.alert('No Tree Found', 'You need to plant a virtual tree first!');
      return;
    }
    if (images.length === 0) {
      Alert.alert('No Photos', 'Please select at least 1 photo of your real tree.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Not Logged In', 'Please login first.');
        return;
      }

      // Build multipart/form-data
      const formData = new FormData();
      formData.append('treeId', treeId);
      formData.append('day', String(selectedDay));
      formData.append('notes', notes || 'Real plantation growth proof.');

      images.forEach((img, index) => {
        let filename = img.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : 'image/jpeg';
        
        // Force .jpg extension if camera image lacks it (common on Android)
        if (!match) {
            filename = `camera_photo_${index}.jpg`;
            type = 'image/jpeg';
        }

        formData.append('photos', {
          uri: img.uri,
          name: filename,
          type: type,
        });
      });

      const res = await fetch(`${BASE_URL}/tree/real-plantation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert(
          '✅ Proof Submitted!',
          `Your Day ${selectedDay} plantation proof has been sent to the admin for review. You'll be rewarded ₹50 upon approval!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Upload Failed', data.error || 'Something went wrong. Please try again.');
      }
    } catch (e) {
      console.log('Upload error:', e);
      Alert.alert('Network Error', 'Could not connect to backend. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Real Tree Proof</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Tree Info Badge */}
        {treeName ? (
          <View style={styles.treeBadge}>
            <MaterialCommunityIcons name="tree" size={20} color="#1B5E20" />
            <Text style={styles.treeBadgeText}>Tree: {treeName}</Text>
          </View>
        ) : null}

        {/* Instruction Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📸 How to Earn ₹50</Text>
          <Text style={styles.infoText}>1. Plant a real tree in your garden/community.</Text>
          <Text style={styles.infoText}>2. Upload photos on Day 1, 7, 15, and 30.</Text>
          <Text style={styles.infoText}>3. Admin reviews and approves your proof.</Text>
          <Text style={styles.infoText}>4. ₹50 is credited to your wallet instantly!</Text>
        </View>

        {/* Day Milestone Selector */}
        <Text style={styles.sectionLabel}>Select Milestone Day</Text>
        <View style={styles.dayRow}>
          {allowedDays.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, selectedDay === d && styles.dayBtnActive]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayBtnText, selectedDay === d && styles.dayBtnTextActive]}>Day {d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Upload Options */}
        <Text style={styles.sectionLabel}>Upload Photos (max 3)</Text>
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={28} color="#1B5E20" />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
            <Ionicons name="images" size={28} color="#1B5E20" />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Photos Preview */}
        {images.length > 0 && (
          <View style={styles.previewRow}>
            {images.map((img, i) => (
              <View key={i} style={styles.previewContainer}>
                <Image source={{ uri: img.uri }} style={styles.preview} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={22} color="#e53935" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {images.length === 0 && (
          <View style={styles.emptyPhotos}>
            <MaterialCommunityIcons name="image-plus" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No photos selected yet</Text>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadBtn, loading && { opacity: 0.7 }]}
          onPress={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.uploadBtnText}> Submit for Review</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ⚠️ Upload within ±24 hours of the milestone day. Fake proofs will be rejected and flagged.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FCF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2
  },
  backBtn: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  scroll: { padding: 20, paddingBottom: 50 },

  treeBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 16
  },
  treeBadgeText: { marginLeft: 8, color: '#1B5E20', fontWeight: 'bold' },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 24,
    elevation: 2, borderLeftWidth: 4, borderLeftColor: '#1B5E20'
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20', marginBottom: 10 },
  infoText: { color: '#555', fontSize: 13, marginBottom: 4, lineHeight: 20 },

  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },

  dayRow: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  dayBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: '#A5D6A7'
  },
  dayBtnActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  dayBtnText: { color: '#1B5E20', fontWeight: 'bold', fontSize: 13 },
  dayBtnTextActive: { color: '#fff' },

  photoActions: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  photoBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18,
    alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E8F5E9'
  },
  photoBtnText: { marginTop: 6, color: '#1B5E20', fontWeight: 'bold', fontSize: 13 },

  previewRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  previewContainer: { position: 'relative' },
  preview: { width: (width - 60) / 3, height: (width - 60) / 3, borderRadius: 12, backgroundColor: '#eee' },
  removeBtn: { position: 'absolute', top: -8, right: -8 },

  emptyPhotos: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0',
    borderRadius: 20, padding: 30, marginBottom: 20, borderStyle: 'dashed',
    borderWidth: 2, borderColor: '#ccc'
  },
  emptyText: { color: '#aaa', marginTop: 10, fontSize: 13 },

  uploadBtn: {
    backgroundColor: '#1B5E20', borderRadius: 30, height: 55,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, elevation: 4
  },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disclaimer: { textAlign: 'center', color: '#999', fontSize: 11, lineHeight: 17 }
});
