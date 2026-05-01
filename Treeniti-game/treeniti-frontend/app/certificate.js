import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, ScrollView, Alert, Share, ImageBackground, ActivityIndicator } from 'react-native';
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

      const profRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profData = await profRes.json();
      if (profData.success) {
        setUserName(profData.user.name);
      }

      const treeRes = await fetch(`${BASE_URL}/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const treeData = await treeRes.json();
      if (treeData.success) {
        setTrees(treeData.trees);
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
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      // 1. Request Permissions (Write-only for saving certificates)
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need storage permissions to save the certificate to your gallery.");
        setLoading(false);
        return;
      }

      // 2. Capture the certificate view
      // Small delay to ensure rendering is complete
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile'
      });

      if (!uri) throw new Error("Capture failed");

      // 3. Save to Media Library
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      // 4. Try to create/add to album (optional, wrapped in try/catch to avoid fatal fail if album exists)
      try {
        const album = await MediaLibrary.getAlbumAsync('Treeniti');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('Treeniti', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumError) {
        console.log("Album error (non-fatal):", albumError);
      }

      Alert.alert(
        "🎉 Success", 
        "Certificate saved to your Gallery! 🌳",
        [{ text: "OK" }, { text: "Share Instead", onPress: () => Sharing.shareAsync(uri) }]
      );
    } catch (error) {
      console.error("Download Error:", error);
      Alert.alert("Download Failed", "Something went wrong. You can try sharing the certificate instead.");
      
      // Fallback: Try Sharing if Gallery Save fails
      try {
        const uri = await captureRef(viewRef, { format: 'png', quality: 0.8 });
        if (uri) await Sharing.shareAsync(uri);
      } catch (e) {}
    } finally {
      setLoading(false);
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
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#fff" />
          )}
          <Text style={styles.actionText}>{loading ? "Saving..." : "Download Image"}</Text>
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

  certCard: { marginHorizontal: 5, marginBottom: 40 },
  certificateWrapper: { width: width - 20, backgroundColor: '#fff', borderRadius: 15, elevation: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, overflow: 'hidden' },

  fullTemplateBg: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  nameOverlayContainer: {
    position: 'absolute',
    top: '-20 %',
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
  actionText: { color: '#fff', fontSize: 13, fontWeight: 'bold' }
});
