import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import BASE_URL from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { language, changeLanguage, t } = useLanguage();

  const [userData, setUserData] = useState({ 
    name: 'Loading...', mobile: '...', 
    walletCoins: 0, avatar: null, 
    language: 'English', joinDate: '',
    referralCode: '', referredBy: null
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            setUserData(data.user);
        }
        setLoading(false);
    } catch(e) { setLoading(false); }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri) => {
    setUploading(true);
    console.log("Starting upload for URI:", uri);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Android URI adjustment (Ensures 'file://' prefix is handled correctly)
      const cleanUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
      
      const formData = new FormData();
      formData.append('avatar', {
          uri: cleanUri, 
          name: `avatar_${Date.now()}.jpg`, 
          type: 'image/jpeg'
      });

      console.log("Sending Request to:", `${BASE_URL}/auth/profile/avatar`);

      const res = await fetch(`${BASE_URL}/auth/profile/avatar`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          body: formData
      });

      const data = await res.json();
      console.log("Server Response:", data);

      if(data.success) {
          // 🛡️ Add Cache-Buster to force immediate UI refresh
          const finalUrl = `${data.avatarUrl}?t=${Date.now()}`;
          setUserData({...userData, avatar: finalUrl});
          Alert.alert("Success", "Avatar updated successfully!");
      } else {
          Alert.alert("Upload Failed", data.error || "Server rejected the image");
      }
    } catch(e) { 
      console.log("Upload Error Details:", e);
      Alert.alert("Network Error", `Could not connect to ${BASE_URL}. Check your server logs.`); 
    }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: userData.name, language: userData.language })
        });
        if(res.ok) Alert.alert("Success", "Profile details saved.");
    } catch(e) {}
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "🗑️ Delete Account?",
      "Your deletion request will be sent to the Admin for approval. This action is serious.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Request Deletion", 
          style: "destructive",
          onPress: async () => {
             try {
                const token = await AsyncStorage.getItem('userToken');
                const res = await fetch(`${BASE_URL}/auth/request-deletion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ reason: "User requested deletion from profile screen" })
                });
                const data = await res.json();
                if (data.success) {
                   Alert.alert("Request Sent", "Your account deletion request is now pending Admin approval.");
                } else {
                   Alert.alert("Error", data.error || "Failed to submit request.");
                }
             } catch(e) {
                Alert.alert("Error", "Network error. Try again later.");
             }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
           <Text style={styles.brandText}>{t.profileTitle}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.coinBadge}>
            <FontAwesome5 name="coins" size={14} color="#1B5E20" style={{ marginRight: 6 }} />
            <Text style={styles.coinText}>{userData.walletCoins}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.avatarWrapper}>
          <Image 
             source={userData.avatar ? { uri: userData.avatar } : require('../assets/user.png')} 
             style={styles.mainAvatar} 
          />
          <TouchableOpacity style={styles.editBadge} onPress={pickImage}>
             <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
          {uploading && <ActivityIndicator style={styles.absLoader} />}
        </View>

        <Text style={styles.userName}>{userData.name}</Text>
        <Text style={styles.userJoined}>{t.joined}: {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Today'}</Text>
        
        <View style={styles.refBadge}>
            <Text style={styles.refText}>{t.inviteCode}: {userData.referralCode}</Text>
        </View>

        {/* --- FORM INPUTS --- */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.fullName}</Text>
            <TextInput 
              style={styles.inputField} 
              value={userData.name}
              onChangeText={(t) => setUserData({...userData, name: t})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.phone}</Text>
            <TextInput 
              style={[styles.inputField, {color: '#888'}]} 
              value={userData.mobile}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.languageLabel}</Text>
            <View style={{height: 10}} />
            <View style={styles.langPicker}>
                <TouchableOpacity onPress={() => changeLanguage('en')} style={[styles.langOpt, language === 'en' && styles.langActive]}>
                    <Text style={[styles.langOptText, language === 'en' && styles.langActiveText]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLanguage('hi')} style={[styles.langOpt, language === 'hi' && styles.langActive]}>
                    <Text style={[styles.langOptText, language === 'hi' && styles.langActiveText]}>हिंदी (Hindi)</Text>
                </TouchableOpacity>
            </View>
          </View>

          {/* --- SAVE BUTTON --- */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t.save}</Text>
          </TouchableOpacity>

          {/* --- DELETE ACCOUNT --- */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={16} color="#FF5252" />
            <Text style={styles.deleteBtnText}>Request Account Deletion</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- 🟢 Optimized Docked Navbar --- */}
      <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />

        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.85} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="camera" size={26} color="#fff" />
            <Text style={styles.centerText}>UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label="Fertilize" onPress={() => router.push('/plant')} />
        <TabItem icon="cash-outline" label="Earn" active={pathname === '/profile'} onPress={() => {}} />
      </View>

    </SafeAreaView>
  );
}

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity 
    style={styles.tabBtn} 
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={[styles.tabIconCircle, active && { backgroundColor: '#fff' }]}>
      <Ionicons name={icon} size={20} color={active ? "#1B5E20" : "#fff"} />
    </View>
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F4F8F4' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  brandText: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  coinBadge: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, marginRight: 8, elevation: 2, alignItems: 'center' },
  coinText: { fontWeight: 'bold', color: '#1B5E20' },

  scrollContent: { alignItems: 'center', paddingBottom: 150, paddingTop: 30 },
  avatarWrapper: { position: 'relative' },
  mainAvatar: { width: width * 0.35, height: width * 0.35, borderRadius: (width * 0.35) / 2, borderWidth: 3, borderColor: '#FFF', elevation: 10 },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#1B5E20', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  absLoader: { position: 'absolute', top: '40%', left: '40%' },
  
  userName: { fontSize: 24, fontWeight: 'bold', color: '#1B3C1B', marginTop: 15 },
  userJoined: { fontSize: 12, color: '#666', marginTop: 2 },
  refBadge: { backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 10, marginTop: 12 },
  refText: { fontSize: 11, fontWeight: 'bold', color: '#1B5E20' },

  formContainer: { width: '85%', marginTop: 10 },
  inputGroup: { marginTop: 25 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#666', marginBottom: 10, marginLeft: 5 },
  inputField: { backgroundColor: '#f0f0f0', height: 60, borderRadius: 15, paddingHorizontal: 20, fontSize: 16, color: '#333', fontWeight: '500' },

  langPicker: { flexDirection: 'row', gap: 10 },
  langOpt: { flex: 1, height: 50, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  langActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  langOptText: { fontSize: 13, color: '#666' },
  langActiveText: { color: '#fff', fontWeight: 'bold' },

  saveBtn: { backgroundColor: '#1B5E20', paddingVertical: 18, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 40, width: '100%', elevation: 5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, paddingVertical: 12, gap: 8 },
  deleteBtnText: { color: '#FF5252', fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' },

  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#6DBE71',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 1, fontWeight: '700', textAlign: 'center' },
  centerBtn: { marginTop: -20, alignItems: 'center' },
  centerBtnInner: { width: 54, height: 54, backgroundColor: '#1B3C1B', borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#F4F8F4' },
  centerText: { fontSize: 6.5, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -1 },
});
