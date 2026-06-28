import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, ScrollView, Alert, Share, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');
const MAX_WIDTH = 500;

export default function Certificate() {
  const router = useRouter();
  const [userName, setUserName] = useState("Treeniti User");
  const [virtualTrees, setVirtualTrees] = useState([]);
  const [realProofs, setRealProofs] = useState([]);
  const [activeTab, setActiveTab] = useState('virtual'); // 'virtual' | 'real'
  const [loading, setLoading] = useState(true);

  const fetchProfileAndTrees = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const profRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profData = await profRes.json();
      if (profData.success) {
        setUserName(profData.user.name);
      }

      // Fetch Virtual Trees
      const treeRes = await fetch(`${BASE_URL}/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const treeData = await treeRes.json();
      if (treeData.success) {
        // FILTER: Only show trees that are completely grown (growth >= 100)
        const eligibleVirtual = treeData.trees.filter(t => t.growth >= 100);
        setVirtualTrees(eligibleVirtual);
      }

      // Fetch Real plantation proofs
      const proofRes = await fetch(`${BASE_URL}/tree/real-plantation/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const proofData = await proofRes.json();
      if (proofData.success) {
        // FILTER: Only show real trees verified/approved by admin
        const eligibleReal = proofData.proofs.filter(p => p.status === 'Verified');
        setRealProofs(eligibleReal);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfileAndTrees(); }, []));

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tree Certificates</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Beautiful Glassmorphic Tab Container */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'virtual' && styles.activeTabButton]}
            onPress={() => setActiveTab('virtual')}
          >
            <FontAwesome5 name="seedling" size={14} color={activeTab === 'virtual' ? '#fff' : '#1B5E20'} />
            <Text style={[styles.tabButtonText, activeTab === 'virtual' && styles.activeTabButtonText]}>Virtual Trees</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'real' && styles.activeTabButton]}
            onPress={() => setActiveTab('real')}
          >
            <FontAwesome5 name="tree" size={14} color={activeTab === 'real' ? '#fff' : '#1B5E20'} />
            <Text style={[styles.tabButtonText, activeTab === 'real' && styles.activeTabButtonText]}>Real Trees</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#1B5E20" />
          </View>
        ) : activeTab === 'virtual' ? (
          virtualTrees.length === 0 ? (
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="seed-outline" size={80} color="#C8E6C9" />
              <Text style={styles.emptyTitle}>Virtual Tree Growing 🌳</Text>
              <Text style={styles.emptyText}>
                Your virtual tree is still growing! Water it daily and harvest its fruits once it grows to 100% to earn your Official Certificate here.
              </Text>
              <TouchableOpacity style={styles.plantNowBtn} onPress={() => router.push('/home')}>
                <Text style={styles.plantNowText}>Go to Garden</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.pageSub}>Congratulations! Here are your virtual plantation certificates.</Text>
              {virtualTrees.map((tree) => (
                <CertificateCard key={tree._id} tree={tree} userName={userName} />
              ))}
            </ScrollView>
          )
        ) : (
          realProofs.length === 0 ? (
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="image-search-outline" size={80} color="#FFCCBC" />
              <Text style={styles.emptyTitle}>No Verified Real Trees 🌲</Text>
              <Text style={styles.emptyText}>
                No verified real tree plantations yet. Upload your proof photos in the Photo Upload section, and once the administrator approves it, your certificate will unlock here!
              </Text>
              <TouchableOpacity style={[styles.plantNowBtn, { backgroundColor: '#D84315' }]} onPress={() => router.push('/upload_tree')}>
                <Text style={styles.plantNowText}>Upload Real Proof</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.pageSub}>Congratulations! Here are your verified real plantation certificates.</Text>
              {realProofs.map((proof) => (
                <CertificateCard 
                  key={proof._id} 
                  tree={{
                    _id: proof._id,
                    treeName: proof.treeId?.treeName || "Real Tree",
                    plantedAt: proof.verifiedAt || proof.submittedAt,
                    isReal: true,
                    day: proof.day
                  }} 
                  userName={userName} 
                />
              ))}
            </ScrollView>
          )
        )}
      </SafeAreaView>
    </View>
  );
}

const CertificateCard = ({ tree, userName }) => {
  const viewRef = useRef();
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    try {
      setLoading(true);
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile'
      });

      if (!uri) throw new Error("Capture failed");

      // Directly open the share sheet which allows saving the image locally or sharing it to other apps without permissions.
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Save or Share Certificate',
        mimeType: 'image/png'
      });
    } catch (error) {
      console.error("Download Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShareText = async () => {
    try {
      const shareMsg = tree.isReal 
        ? `I've successfully planted and verified a real tree "${tree.treeName}" (Milestone: Day ${tree.day}) using the Treeniti app! My Tree ID: ${tree._id.substring(tree._id.length - 8)}. Let's make the Earth greener together!`
        : `I've successfully planted and harvested a virtual tree "${tree.treeName}" on Treeniti app! My Tree ID: ${tree._id.substring(tree._id.length - 8)}. Join me in saving the planet!`;

      await Share.share({
        message: shareMsg,
        url: 'https://treeniti.com',
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  return (
    <View style={styles.certCard}>
      <View style={styles.cardHeaderRow}>
        {/* 🏷️ Certificate Type Ribbon Badge */}
        <View style={[styles.typeBadge, tree.isReal ? styles.realBadge : styles.virtualBadge]}>
          <FontAwesome5 name={tree.isReal ? "tree" : "seedling"} size={10} color="#fff" />
          <Text style={styles.typeBadgeText}>
            {tree.isReal ? `REAL TREE (DAY ${tree.day})` : "VIRTUAL TREE"}
          </Text>
        </View>
        <Text style={styles.treeInfoText}>
          Tree: <Text style={styles.boldText}>{tree.treeName}</Text> ({tree.isReal ? 'Verified Real' : '100% Grown'})
        </Text>
      </View>

      <ViewShot ref={viewRef} options={{ format: 'png', quality: 1 }}>
        <View style={styles.certificateWrapper}>
          <ImageBackground
            source={require('../assets/user_template.jpg')}
            style={styles.fullTemplateBg}
            imageStyle={{ borderRadius: 15 }}
          >
            <View style={styles.nameOverlayContainer}>
              <Text style={styles.dynamicNameText}>{userName}</Text>
            </View>

            <View style={styles.dateOverlayContainer}>
              <Text style={styles.dynamicDateText}>
                {new Date(tree.plantedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </ImageBackground>
        </View>
      </ViewShot>

      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, tree.isReal && { backgroundColor: '#D84315' }]} onPress={handleDownload} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#fff" />
          )}
          <Text style={styles.actionText}>{loading ? "Saving..." : "Download Image"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShareText}>
          <Ionicons name="share-social-outline" size={18} color={tree.isReal ? '#D84315' : '#1B5E20'} />
          <Text style={[styles.actionText, { color: tree.isReal ? '#D84315' : '#1B5E20' }]}>Share Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#E0E0E0', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F5F9F5', width: '100%', maxWidth: MAX_WIDTH },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', elevation: 2 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
    padding: 5,
    marginHorizontal: 20,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#1B5E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  activeTabButtonText: {
    color: '#fff',
  },

  pageSub: { paddingHorizontal: 20, fontSize: 12, color: '#666', marginVertical: 8, textAlign: 'center' },
  scrollContent: { paddingBottom: 50 },

  centerSpinner: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginTop: 15, marginBottom: 5 },
  emptyText: { textAlign: 'center', color: '#666', lineHeight: 22 },
  plantNowBtn: { marginTop: 30, backgroundColor: '#1B5E20', paddingHorizontal: 35, paddingVertical: 12, borderRadius: 25 },
  plantNowText: { color: '#fff', fontWeight: 'bold' },

  certCard: { marginHorizontal: 5, marginBottom: 40 },
  certificateWrapper: { width: width - 20, backgroundColor: '#fff', borderRadius: 15, elevation: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, overflow: 'hidden' },

  typeBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
    marginLeft: 10,
  },
  virtualBadge: {
    backgroundColor: '#1B5E20',
  },
  realBadge: {
    backgroundColor: '#D84315',
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  fullTemplateBg: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  nameOverlayContainer: {
    position: 'absolute',
    top: '-20%',
    width: '100%',
    alignItems: 'center',
    left: '-15%',
    marginBottom: 82
  },
  dynamicNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B3C1B',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  dateOverlayContainer: {
    position: 'absolute',
    bottom: '28%',
    left: '8.2%',
  },
  dynamicDateText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1B5E20',
  },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 10 },
  actionBtn: { flex: 1, backgroundColor: '#1B5E20', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  shareBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#1B5E20' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  cardHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingRight: 10 
  },
  treeInfoText: { 
    fontSize: 11, 
    color: '#666',
  },
  boldText: { 
    fontWeight: 'bold', 
    color: '#1B5E20' 
  }
});
