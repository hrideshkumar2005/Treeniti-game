import React, { useState, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import BASE_URL from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function UploadTree() {
  const router = useRouter();
  const { language } = useLanguage();
  
  const [images, setImages] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [treeId, setTreeId] = useState(null);
  const [treeName, setTreeName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [realPlantName, setRealPlantName] = useState('');
  const [realPlantDate, setRealPlantDate] = useState(new Date().toISOString().split('T')[0]);
  const [realPlantTime, setRealPlantTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [realPlantLocation, setRealPlantLocation] = useState('');
  const [proofs, setProofs] = useState([]);
  
  const [unlockInfo, setUnlockInfo] = useState({ nextDay: 1, unlockDate: null, isLocked: false, completed: false });
  const [timeLeft, setTimeLeft] = useState('');

  const allowedDays = [1, 7, 15, 30];

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      // Fetch Virtual Tree Context
      const res = await fetch(`${BASE_URL}/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.trees.length > 0) {
        const activeTree = data.trees[0];
        setTreeId(activeTree._id);
        setTreeName(activeTree.treeName);
      }

      // Fetch Uploaded Real Tree Proofs (User can see their trees)
      const proofRes = await fetch(`${BASE_URL}/tree/real-plantation/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const proofData = await proofRes.json();
      if (proofData.success) {
        setProofs(proofData.proofs);
        
        // Timer Logic
        const submittedDays = proofData.proofs.map(p => p.day);
        const maxDay = submittedDays.length > 0 ? Math.max(...submittedDays) : 0;
        
        let nextDay = 1;
        let uDate = null;
        let completed = false;
        
        if (maxDay === 0) nextDay = 1;
        else if (maxDay === 1) nextDay = 7;
        else if (maxDay === 7) nextDay = 15;
        else if (maxDay === 15) nextDay = 30;
        else {
          completed = true;
          nextDay = null;
        }
        
        if (nextDay && maxDay > 0) {
          const lastProof = proofData.proofs.find(p => p.day === maxDay);
          if (lastProof) {
            // Strict 7 days gap interval between uploads
            uDate = new Date(lastProof.submittedAt);
            uDate.setDate(uDate.getDate() + 7);
          }
        }
        
        setUnlockInfo({ nextDay, unlockDate: uDate, isLocked: uDate ? new Date() < uDate : false, completed });
        if (nextDay) setSelectedDay(nextDay);
      }
    } catch (e) {
      console.log('Error fetching data:', e);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  useEffect(() => {
    if (!unlockInfo.isLocked || !unlockInfo.unlockDate) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = unlockInfo.unlockDate - now;
      if (diff <= 0) {
        setUnlockInfo(prev => ({ ...prev, isLocked: false }));
        setTimeLeft('');
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [unlockInfo]);



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
          setImages(prev => [...prev, { uri: imageUri }].slice(0, 4));
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
    if (!realPlantName || !realPlantName.trim()) {
      Alert.alert('Missing Details', 'Please enter the Plant Name before submitting.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('No Photos', 'Please take at least 1 photo of your real tree.');
      return;
    }
    if (!realPlantLocation || !realPlantLocation.trim()) {
      Alert.alert('Missing Details', 'Please enter the Location before submitting.');
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
      const formattedNotes = `Plant Name: ${realPlantName || 'N/A'}\nDate: ${realPlantDate}\nTime: ${realPlantTime}\nLocation: ${realPlantLocation || 'N/A'}`;
      
      const formData = new FormData();
      formData.append('treeId', treeId);
      formData.append('day', String(selectedDay));
      formData.append('notes', formattedNotes);

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
          [{ 
            text: 'OK', 
            onPress: () => {
              setImages([]);
              setRealPlantName('');
              setRealPlantLocation('');
              fetchData();
            }  
          }]
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
        <Text style={styles.headerTitle}>{language === 'hi' ? 'वृक्षारोपण प्रमाण' : 'Real Tree Proof'}</Text>
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
          <Text style={styles.infoTitle}>📸 {language === 'hi' ? '₹50 कैसे कमाएं' : 'How to Earn ₹50'}</Text>
          <Text style={styles.infoText}>{language === 'hi' ? '1. अपने बगीचे/समुदाय में एक असली पेड़ लगाएं।' : '1. Plant a real tree in your garden/community.'}</Text>
          <Text style={styles.infoText}>{language === 'hi' ? '2. प्रमाण जमा करें। एडमिन इसकी समीक्षा करेगा।' : '2. Submit proofs. Admin reviews and approves it.'}</Text>
          <Text style={styles.infoText}>{language === 'hi' ? '3. मंज़ूरी मिलने पर ₹50 तुरंत आपके वॉलेट में आ जाएंगे!' : '3. ₹50 is credited to your wallet instantly upon approval!'}</Text>
          
          <Text style={[styles.sectionLabel, { marginTop: 10, marginBottom: 5 }]}>{language === 'hi' ? 'फोटो दिशानिर्देश (अधिकतम 4):' : 'Photo Guidelines (Up to 4):'}</Text>
          <Text style={styles.infoText}>🌿 • {language === 'hi' ? 'पेड़ की साफ फोटो' : 'Clear image of the tree'}</Text>
          <Text style={styles.infoText}>🧑‍🌾 • {language === 'hi' ? 'पेड़ लगाते हुए आपकी फोटो' : 'Image of you planting the tree'}</Text>
          <Text style={styles.infoText}>💧 • {language === 'hi' ? 'पेड़ को पानी देते हुए आपकी फोटो' : 'Image of you watering the tree'}</Text>
          <Text style={styles.infoText}>🏡 • {language === 'hi' ? 'जगह दिखाने वाली चौड़ी फोटो' : 'Wide-angle shot showing location'}</Text>
        </View>

        {/* Plant Details Form */}
        <Text style={styles.sectionLabel}>{language === 'hi' ? 'पौधे का विवरण' : 'Plant Details'}</Text>
        
        {unlockInfo.completed ? (
          <View style={styles.completedCard}>
            <MaterialCommunityIcons name="check-decagram" size={50} color="#4CAF50" />
            <Text style={styles.completedTitle}>{language === 'hi' ? 'सभी चरण पूरे हुए!' : 'All Milestones Completed!'}</Text>
            <Text style={styles.completedText}>{language === 'hi' ? 'आपने इस पेड़ के लिए सभी प्रमाण सफलतापूर्वक जमा कर दिए हैं।' : 'You have successfully submitted all proofs for this tree.'}</Text>
          </View>
        ) : unlockInfo.isLocked ? (
          <View style={styles.lockedCard}>
            <MaterialCommunityIcons name="timer-sand" size={40} color="#FF9800" />
            <Text style={styles.lockedTitle}>{language === 'hi' ? 'अगला चरण लॉक है' : 'Next Milestone Locked'}</Text>
            <Text style={styles.lockedText}>{language === 'hi' ? `दिन ${unlockInfo.nextDay} खुलेगा:` : `Day ${unlockInfo.nextDay} unlocks in:`}</Text>
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
        ) : (
          <View>
            <TextInput 
              style={styles.inputField} 
              placeholder={language === 'hi' ? 'पौधे का नाम (जैसे: आम, नीम)' : 'Plant Name (e.g. Mango, Neem, Rose)'}
              value={realPlantName} 
              onChangeText={setRealPlantName} 
            />
            <View style={styles.rowInputs}>
              <TextInput 
                style={[styles.inputField, { flex: 1, marginRight: 10 }]} 
                placeholder={language === 'hi' ? 'दिनांक (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'}
                value={realPlantDate} 
                onChangeText={setRealPlantDate} 
              />
              <TextInput 
                style={[styles.inputField, { flex: 1 }]} 
                placeholder={language === 'hi' ? 'समय (जैसे: 10:30 AM)' : 'Time (e.g. 10:30 AM)'}
                value={realPlantTime} 
                onChangeText={setRealPlantTime} 
              />
            </View>
          </View>
        )}

        {/* Day Milestone Selector */}
        {!unlockInfo.completed && (
          <>
            <Text style={styles.sectionLabel}>{language === 'hi' ? 'वर्तमान चरण' : 'Current Milestone'}</Text>
            <View style={styles.dayRow}>
              {allowedDays.map(d => (
                <View
                  key={d}
                  style={[styles.dayBtn, selectedDay === d ? styles.dayBtnActive : { opacity: 0.5 }]}
                >
                  <Text style={[styles.dayBtnText, selectedDay === d && styles.dayBtnTextActive]}>Day {d}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Photo Upload Options */}
        {!unlockInfo.completed && !unlockInfo.isLocked && (
          <>
            <Text style={styles.sectionLabel}>{language === 'hi' ? 'एक फोटो लें (अधिकतम 4)' : 'Take a Photo (max 4)'}</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={28} color="#1B5E20" />
                <Text style={styles.photoBtnText}>{language === 'hi' ? 'कैमरा खोलें' : 'Open Camera'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

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
        
        {/* Location Input (Only shows after photo is taken) */}
        {images.length > 0 && (
          <View style={{ marginBottom: 20 }}>
             <Text style={styles.sectionLabel}>Add Location</Text>
             <TextInput 
               style={styles.inputField} 
               placeholder="Enter exact location (e.g. City, Landmark)" 
               value={realPlantLocation} 
               onChangeText={setRealPlantLocation} 
             />
          </View>
        )}

        {!unlockInfo.completed && !unlockInfo.isLocked && images.length === 0 && (
          <View style={styles.emptyPhotos}>
            <MaterialCommunityIcons name="image-plus" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No photos selected yet</Text>
          </View>
        )}

        {/* Upload Button */}
        {!unlockInfo.completed && !unlockInfo.isLocked && (
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
                <Text style={styles.uploadBtnText}> {language === 'hi' ? 'समीक्षा के लिए सबमिट करें' : 'Submit for Review'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          ⚠️ {language === 'hi' ? 'तय दिन के ±24 घंटे के भीतर अपलोड करें। फर्जी प्रमाणों को अस्वीकार कर दिया जाएगा।' : 'Upload within ±24 hours of the milestone day. Fake proofs will be rejected and flagged.'}
        </Text>

        {/* User's Uploaded Trees History */}
        {proofs.length > 0 && (
          <View style={{ marginTop: 30, marginBottom: 20 }}>
            <Text style={styles.sectionLabel}>{language === 'hi' ? 'मेरे अपलोड किए गए पेड़' : 'My Uploaded Trees'}</Text>
            {proofs.map((proof) => (
              <View key={proof._id} style={styles.proofCard}>
                {proof.images && proof.images.length > 0 ? (
                  <Image source={{ uri: proof.images[0] }} style={styles.proofImage} />
                ) : (
                  <View style={[styles.proofImage, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="image-off" size={24} color="#ccc" />
                  </View>
                )}
                <View style={styles.proofInfo}>
                  <Text style={styles.proofNotes} numberOfLines={4}>{proof.notes}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: proof.status === 'Verified' ? '#4CAF50' : proof.status === 'Rejected' ? '#F44336' : '#FF9800' }]}>
                    <Text style={styles.statusText}>{proof.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

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
  inputField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
    elevation: 1
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

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
  disclaimer: { textAlign: 'center', color: '#999', fontSize: 11, lineHeight: 17 },

  proofCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E9'
  },
  proofImage: {
    width: 75,
    height: 75,
    borderRadius: 10,
    marginRight: 15
  },
  proofInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  proofNotes: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
    lineHeight: 18
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  
  lockedCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  lockedTitle: {
    color: '#E65100',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10
  },
  lockedText: {
    color: '#F57C00',
    marginTop: 5,
    fontSize: 14
  },
  timerText: {
    color: '#E65100',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 1
  },
  
  completedCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  completedTitle: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10
  },
  completedText: {
    color: '#2E7D32',
    marginTop: 5,
    fontSize: 13,
    textAlign: 'center'
  }
});
