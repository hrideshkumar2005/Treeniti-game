import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import BASE_URL from '../config/api';

export default function RealTree() {
  const router = useRouter();
  const [trees, setTrees] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [uploadData, setUploadData] = useState({ treeId: null, day: null, uri: null });
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const [treeRes, proofRes] = await Promise.all([
        fetch(`${BASE_URL}/tree`, { headers: { 'Authorization': `Bearer ${token}` }}),
        fetch(`${BASE_URL}/tree/real-plantation/status`, { headers: { 'Authorization': `Bearer ${token}` }})
      ]);
      
      const treeData = await treeRes.json();
      const proofData = await proofRes.json();
      
      if(treeData.success) setTrees(treeData.trees);
      if(proofData.success) setProofs(proofData.proofs);
    } catch(e) {}
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleUpload = async (treeId, day) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
       setUploadData({ treeId, day, uri: result.assets[0].uri });
       setNotes('');
       setShowModal(true);
    }
  };

  const submitProof = async () => {
    const { treeId, day, uri } = uploadData;
    setShowModal(false);
    Alert.alert("Uploading", `Sending Day ${day} proof to Cloudinary...`);
    try {
       const token = await AsyncStorage.getItem('userToken');
       const formData = new FormData();
       formData.append('treeId', treeId);
       formData.append('day', day);
       formData.append('notes', notes || "");
       formData.append('photos', { uri, name: `day_${day}.jpg`, type: 'image/jpeg' });

       const res = await fetch(`${BASE_URL}/tree/real-plantation`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` },
           body: formData
       });
       const data = await res.json();
       if(data.success) {
           Alert.alert("Success", data.message);
           fetchData();
       } else {
           Alert.alert("Compliance Block", data.error);
       }
    } catch(e) { Alert.alert("Error", "Server upload failed."); }
  };

  const getStatus = (treeId, day) => {
     const proof = proofs.find(p => p.treeId === treeId && p.day === day);
     return proof ? proof.status : 'Pending Upload';
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1B5E20" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1B5E20" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Real Plantation Tracking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {trees.length === 0 ? (
           <View style={styles.empty}>
              <Text style={styles.emptyText}>You haven't planted any virtual seeds yet. Go to Garden to start!</Text>
           </View>
        ) : trees.map(tree => (
           <View key={tree._id} style={styles.treeCard}>
              <Text style={styles.treeName}>{tree.treeName}</Text>
              <Text style={styles.sinceText}>Planted on: {new Date(tree.plantedAt).toLocaleDateString()}</Text>
              
              <View style={styles.timeline}>
                 {[1, 7, 15, 30].map(day => {
                    const proof = proofs.find(p => p.treeId === tree._id && p.day === day);
                    const status = proof ? proof.status : 'Pending Upload';
                    
                    const daysSincePlanted = Math.floor((Date.now() - new Date(tree.plantedAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isAvailable = Math.abs(daysSincePlanted - day) <= 1;
                    const isLocked = daysSincePlanted < day - 1;
                    const isMissed = daysSincePlanted > day + 1 && status === 'Pending Upload';

                    let btnStyle = styles.btnUpload;
                    let textStyle = styles.statusText;
                    let label = status;

                    if (status === 'Verified') {
                        btnStyle = styles.btnVerified;
                        textStyle = styles.btnVerifiedText;
                    } else if (status === 'Pending') {
                        btnStyle = styles.btnPending;
                    } else if (isLocked) {
                        btnStyle = styles.btnLocked;
                        label = 'Locked';
                    } else if (isMissed) {
                        btnStyle = styles.btnMissed;
                        label = 'Missed';
                    } else if (isAvailable) {
                        btnStyle = styles.btnAvailable;
                        label = 'Available';
                    }

                    return (
                       <View key={day} style={styles.milestone}>
                          <Text style={styles.dayLabel}>Day {day}</Text>
                          <TouchableOpacity 
                             style={[styles.statusBtn, btnStyle]}
                             onPress={() => (isAvailable && status === 'Pending Upload') && handleUpload(tree._id, day)}
                             disabled={!isAvailable || status !== 'Pending Upload'}
                          >
                             <Text style={[styles.statusText, textStyle]}>{label}</Text>
                          </TouchableOpacity>
                       </View>
                    );
                 })}
              </View>
           </View>
        ))}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={showModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Documentation</Text>
            {uploadData.uri && <Image source={{ uri: uploadData.uri }} style={styles.previewImg} />}
            <Text style={styles.modalLabel}>Activity Notes (Daily Checklist)</Text>
            <TextInput 
              style={styles.modalInput}
              placeholder="e.g. Tree looks healthy, watered today."
              placeholderTextColor="#888"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitProof}><Text style={styles.confirmText}>Upload Proof</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
         <TouchableOpacity style={styles.uploadMain} onPress={() => Alert.alert("Guide", "Select an Available milestone to upload your plantation proof. Verified proofs earn ₹50!")}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.uploadMainText}>Register Growth Proof</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  scroll: { padding: 20, paddingBottom: 100 },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: '#666', textAlign: 'center' },
  treeCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 20, elevation: 4 },
  treeName: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20' },
  sinceText: { fontSize: 12, color: '#888', marginBottom: 20 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between' },
  milestone: { alignItems: 'center', width: '23%' },
  dayLabel: { fontSize: 10, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, width: '100%', alignItems: 'center', justifyContent: 'center' },
  btnUpload: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  btnAvailable: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#1B5E20' },
  btnPending: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FF9800' },
  btnVerified: { backgroundColor: '#1B5E20' },
  btnLocked: { backgroundColor: '#FEEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  btnMissed: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#9E9E9E' },
  statusText: { fontSize: 8, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center' },
  btnVerifiedText: { color: '#fff' },
  footer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  uploadMain: { backgroundColor: '#1B5E20', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 5 },
  uploadMainText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15 },
  previewImg: { width: '100%', height: 200, borderRadius: 15, marginBottom: 15 },
  modalLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, height: 100, textAlignVertical: 'top', color: '#000', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#666', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#1B5E20', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  confirmText: { color: '#fff', fontWeight: 'bold' }
});
