import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, ScrollView, Alert, Share, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import BASE_URL from '../config/api';

const { width } = Dimensions.get('window');
const MAX_WIDTH = 500;

export default function Certificate() {
  const router = useRouter();
  const [userName, setUserName] = useState("Treeniti User");
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndTrees = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Fetch Profile for Name
      const profRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profData = await profRes.json();
      if (profData.success) {
        setUserName(profData.user.name);
      }

      // Fetch Trees
      const treeRes = await fetch(`${BASE_URL}/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const treeData = await treeRes.json();
      if (treeData.success) {
        // SRS 3.7: Certificates for specific milestones or all trees?
        // We'll show certificates for all planted trees to encourage users.
        setTrees(treeData.trees);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProfileAndTrees(); }, []));

  const handleShare = async (tree) => {
    try {
      const result = await Share.share({
        message: `I've successfully planted a tree "${tree.treeName}" on Treeniti app! My Tree ID: ${tree._id.substring(tree._id.length - 8)}. Join me in saving the planet!`,
        url: 'https://treeniti.com', // Placeholder URL
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1B5E20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tree Certificates</Text>
          <View style={{ width: 24 }} />
        </View>

        {trees.length === 0 ? (
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons name="tree-outline" size={80} color="#E8F5E9" />
            <Text style={styles.emptyText}>No trees planted yet.{"\n"}Plant a seed to earn a certificate!</Text>
            <TouchableOpacity style={styles.plantNowBtn} onPress={() => router.push('/home')}>
              <Text style={styles.plantNowText}>Plant Seed Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.pageSub}>Congratulations! Here are your plantation certificates.</Text>
            {trees.map((tree) => (
              <CertificateCard key={tree._id} tree={tree} userName={userName} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const CertificateCard = ({ tree, userName }) => {
  const viewRef = useRef();

  const handleDownload = async () => {
    try {
      // 🛡️ Request Permissions for Saving
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need permission to save the certificate to your gallery.");
        return;
      }

      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
      });

      // 💾 Save to Device Gallery
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Treeniti', asset, false);
      
      Alert.alert("Success", "Certificate saved to your Gallery! 🌳");
    } catch (error) {
      console.error("Capture Error:", error);
      Alert.alert("Error", "Failed to save certificate.");
    }
  };

  const handleShareText = async () => {
    try {
      await Share.share({
        message: `I've successfully planted a tree "${tree.treeName}" on Treeniti app! My Tree ID: ${tree._id.substring(tree._id.length - 8)}. Join me in saving the planet!`,
        url: 'https://treeniti.com',
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  return (
    <View style={styles.certCard}>
      {/* 🏆 PREMIUM CERTIFICATE (SRS 3.7 Compliance) */}
      <ViewShot ref={viewRef} options={{ format: 'png', quality: 1 }}>
        <View style={styles.certificateWrapper}>
          <ImageBackground source={require('../assets/image.png')} style={styles.certBg} imageStyle={{ opacity: 0.1, borderRadius: 15 }}>
            <View style={styles.certBorderOuter}>
              <View style={styles.certBorderInner}>

                {/* --- 🟢 Top Branding --- */}
                <View style={styles.certHeader}>
                  <View style={styles.branding}>
                    <Image source={require('../assets/treeniti_logo.png')} style={styles.certLogo} />
                    <View>
                      <Text style={styles.brandTitle}>Tree Niti</Text>
                      <Text style={styles.brandTagline}>पेड़ भी, पैसा भी, भविष्य भी</Text>
                    </View>
                  </View>
                  <View style={styles.saveLifeBadge}>
                    <Text style={styles.badgeText}>SAVE TREE</Text>
                    <Text style={styles.badgeText}>SAVE LIFE</Text>
                  </View>
                </View>

                <Text style={styles.mainCertTitle}>TREE CERTIFICATE</Text>
                <View style={styles.presentRow}>
                  <View style={styles.presentLine} />
                  <Text style={styles.presentText}>This Certificate Is Proudly Presented To</Text>
                  <View style={styles.presentLine} />
                </View>

                <Text style={styles.recipientName}>{userName}</Text>

                <Text style={styles.congratsText}>
                  For Successfully Planting And Nurturing A Tree With <Text style={{ fontWeight: 'bold' }}>Tree Niti</Text> And Contributing To A Greener, Healthier & Better Tomorrow.
                </Text>

                {/* --- 📊 Milestone Stats --- */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="leaf" size={18} color="#1B5E20" />
                    <Text style={styles.statLabel}>TREE PLANTED</Text>
                    <Text style={styles.statValue}>{new Date(tree.plantedAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.statItem, styles.statBorder]}>
                    <Ionicons name="earth" size={18} color="#1B5E20" />
                    <Text style={styles.statLabel}>YOUR IMPACT</Text>
                    <Text style={styles.statValue}>Better Environment</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={18} color="#1B5E20" />
                    <Text style={styles.statLabel}>YOUR COMMITMENT</Text>
                    <Text style={styles.statValue}>For Future Generations</Text>
                  </View>
                </View>

                {/* --- ✍️ Signatures & Footer --- */}
                <View style={styles.signatureSection}>
                  <View style={styles.signBox}>
                    <Text style={styles.digitalSign}>Alok Chaudhary</Text>
                    <View style={styles.signLine} />
                    <Text style={styles.signLabel}>Founder - Alok Chaudhary</Text>
                  </View>
                  <View style={styles.centerSeal}>
                    <Text style={styles.sealQuote}>"Green Today Better Tomorrow"</Text>
                  </View>
                  <View style={styles.signBox}>
                    <Text style={styles.digitalSign}>Vivek Chaudhary</Text>
                    <View style={styles.signLine} />
                    <Text style={styles.signLabel}>CEO - Vivek Chaudhary</Text>
                  </View>
                </View>

                {/* --- 📍 Tree ID / GPS --- */}
                <View style={styles.locationTag}>
                  <Text style={styles.locationText}>Tree ID: {tree._id.substring(tree._id.length - 8).toUpperCase()}</Text>
                  <Text style={styles.locationText}>Location: GPS Tracked</Text>
                </View>

                {/* --- 📢 Call to Action Footer --- */}
                <View style={styles.ctaFooter}>
                  <View style={styles.qrMock}>
                    <Ionicons name="qr-code" size={30} color="#000" />
                  </View>
                  <Text style={styles.ctaText}>
                    Proudly planted with Tree Niti. Scan QR to grow your own tree!
                  </Text>
                </View>

              </View>
            </View>
          </ImageBackground>
        </View>
      </ViewShot>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Download Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShareText}>
          <Ionicons name="share-social-outline" size={18} color="#1B5E20" />
          <Text style={[styles.actionText, { color: '#1B5E20' }]}>Share Link</Text>
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

  pageSub: { paddingHorizontal: 20, fontSize: 12, color: '#666', marginVertical: 15, textAlign: 'center' },
  scrollContent: { paddingBottom: 50 },

  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, lineHeight: 22 },
  plantNowBtn: { marginTop: 30, backgroundColor: '#1B5E20', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  plantNowText: { color: '#fff', fontWeight: 'bold' },

  certCard: { marginHorizontal: 10, marginBottom: 40 },
  certificateWrapper: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden'
  },
  certBg: { padding: 15 },
  certBorderOuter: { borderWidth: 2, borderColor: '#D4AF37', borderRadius: 10, padding: 5 },
  certBorderInner: { borderWidth: 1, borderColor: '#1B5E20', borderRadius: 5, padding: 15, alignItems: 'center', backgroundColor: 'rgba(255,251,240,0.9)' },

  certHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 20 },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  certLogo: { width: 40, height: 40 },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20' },
  brandTagline: { fontSize: 8, color: '#4CAF50', fontWeight: '600' },

  saveLifeBadge: { backgroundColor: '#1B5E20', padding: 8, borderRadius: 10, alignItems: 'center' },
  badgeText: { color: '#FFD700', fontSize: 7, fontWeight: '900' },

  mainCertTitle: { fontSize: 28, fontWeight: '900', color: '#1B5E20', letterSpacing: 1, marginBottom: 10 },

  presentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  presentLine: { flex: 1, height: 1, backgroundColor: '#D4AF37' },
  presentText: { fontSize: 10, color: '#1B5E20', fontWeight: '600', backgroundColor: '#1B5E20', color: '#fff', paddingHorizontal: 15, paddingVertical: 4, borderRadius: 5 },

  recipientName: { fontSize: 32, color: '#1B5E20', fontWeight: 'bold', marginBottom: 10, fontStyle: 'italic', textDecorationLine: 'underline', textDecorationColor: '#D4AF37' },

  congratsText: { textAlign: 'center', fontSize: 11, color: '#333', lineHeight: 18, paddingHorizontal: 10, marginBottom: 20 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: 'rgba(27, 94, 32, 0.05)', padding: 12, borderRadius: 10, marginBottom: 25 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(27, 94, 32, 0.2)' },
  statLabel: { fontSize: 7, fontWeight: 'bold', color: '#666', marginTop: 5 },
  statValue: { fontSize: 9, fontWeight: 'bold', color: '#1B5E20', marginTop: 2 },

  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', marginBottom: 20 },
  signBox: { alignItems: 'center', flex: 1 },
  digitalSign: { fontSize: 16, color: '#5C4033', fontStyle: 'italic', fontWeight: 'bold' },
  signLine: { width: '80%', height: 1, backgroundColor: '#D4AF37', marginVertical: 5 },
  signLabel: { fontSize: 8, fontWeight: 'bold', color: '#1B5E20' },

  centerSeal: { flex: 1, alignItems: 'center' },
  sealQuote: { fontSize: 12, color: '#1B5E20', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center' },

  locationTag: { backgroundColor: '#1B5E20', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20, marginBottom: 20 },
  locationText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },

  ctaFooter: { flexDirection: 'row', alignItems: 'center', gap: 15, width: '100%', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  qrMock: { width: 50, height: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  ctaText: { flex: 1, fontSize: 9, color: '#666', fontWeight: 'bold', fontStyle: 'italic' },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 10 },
  actionBtn: { flex: 1, backgroundColor: '#1B5E20', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  shareBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#1B5E20' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: 'bold' }
});
