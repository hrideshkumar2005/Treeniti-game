import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  ImageBackground, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

export default function PlantForm() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handlePlantSeed = async () => {
    if (!name.trim()) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Not Logged In", "You must be logged in to plant a tree.");
        return;
      }

      // Connect to MongoDB Backend
      const response = await fetch(`${BASE_URL}/tree/plant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ treeName: name.trim() })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success!", `Your shiny new tree "${data.tree.treeName}" seed has been planted! 🌱`);
        router.replace('/plant'); // Move back to garden
      } else {
        Alert.alert("Error Planting", data.error || "Action failed.");
      }
    } catch (e) {
      console.log("API Error:", e);
      Alert.alert("Network Error", "Unable to connect to backend server.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* --- Background Garden Image --- */}
      <ImageBackground source={require('../assets/image.png')} style={styles.bgImage} resizeMode="cover">
        
        {/* Transparent Overlay */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          
          {/* --- Top Curved Header (Slightly Transparent) --- */}
          <View style={styles.topInfo}>
             {/* 🔥 NEW: Back Button Added Here */}
             <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
               <Ionicons name="arrow-back" size={28} color="#1B3C1B" />
             </TouchableOpacity>

             <Text style={styles.topTitle}>My Garden</Text>
             <Text style={styles.topSub}>Plants : 1</Text>
          </View>

          {/* --- Center Modal Card (More Transparent Glassmorphism) --- */}
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Plants</Text>

            {/* Peach Colored Input Row */}
            <View style={styles.inputRow}>
              <Text style={styles.listNum}>1. </Text>
              <TextInput 
                style={styles.input} 
                value={name}
                onChangeText={setName}
                placeholder="Ram Plant"
                placeholderTextColor="#333"
              />
              <MaterialIcons name="edit" size={20} color="#000" />
            </View>

            {/* Dark Green Action Button */}
            <TouchableOpacity style={styles.mainBtn} onPress={handlePlantSeed} activeOpacity={0.8}>
              <Text style={styles.btnText}>New Plant</Text>
              <Text style={styles.btnSub}>Max : 2</Text>
            </TouchableOpacity>
          </View>

          {/* --- Below Card Content --- */}
          <View style={styles.bottomContent}>
            
            {/* Action Buttons */}
            <View style={styles.actionRow}>
               <TouchableOpacity style={styles.waterBtn}>
                 <Ionicons name="water" size={18} color="#fff" />
                 <Text style={styles.waterText}> Water Tree</Text>
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.fertilizeBtn}>
                 <MaterialCommunityIcons name="leaf" size={18} color="#5D4037" />
                 <Text style={styles.fertilizeText}> Fertilize</Text>
               </TouchableOpacity>
            </View>

            {/* Daily Growth Progress Bar */}
            <View style={styles.growthSection}>
              <View style={styles.growthHeader}>
                <Text style={styles.growthText}>Daily Growth</Text>
                <Text style={styles.growthPercent}>2/4%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '50%' }]} />
                <View style={styles.progressDot} />
              </View>
            </View>
            
          </View>

        </KeyboardAvoidingView>
      </ImageBackground>

      {/* --- Fixed Bottom Navbar --- */}
      <View style={styles.bottomTab}>
        <TabItem icon="home" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Add Water" />
        
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.9}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="add" size={26} color="#fff" />
            <Text style={styles.centerBtnText}>PHOTO{"\n"}UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label="Add Fertilizer" />
        <TabItem icon="cash-outline" label="Earn More" />
      </View>
    </View>
  );
}

// Helper Tab Item
const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <View style={[styles.tabIconCircle, active && {backgroundColor: '#fff'}]}>
      <Ionicons name={icon} size={20} color={active ? "#1B5E20" : "#fff"} />
    </View>
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F0F0F0' },
  bgImage: { width: width, height: height },
  
  overlay: { flex: 1, backgroundColor: 'transparent' }, 
  
  // Top Header Curve
  topInfo: { 
    width: '100%', 
    height: 100, 
    backgroundColor: 'rgba(200, 230, 235, 0.8)', 
    borderBottomLeftRadius: 50, 
    borderBottomRightRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 20,
    position: 'relative' // Position relative zaroori hai back button ke liye
  },
  // 🔥 NEW: Back Button Style
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 40,
    padding: 5,
    zIndex: 10
  },
  topTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B3C1B' },
  topSub: { fontSize: 15, fontWeight: 'bold', color: '#1B3C1B', marginTop: 5 },

  modalCard: { 
    width: '75%', 
    backgroundColor: 'rgba(255, 255, 255, 0.55)', 
    borderRadius: 20, 
    padding: 30, 
    marginTop: 30,
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.6)',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  cardTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 30, color: '#000' },
  
  inputRow: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255, 204, 188, 0.9)', 
    width: '100%', 
    paddingHorizontal: 20,
    paddingVertical: 12, 
    borderRadius: 25, 
    alignItems: 'center',
    marginBottom: 40
  },
  listNum: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  input: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#000' },
  
  mainBtn: { 
    backgroundColor: '#1B3C1B', 
    width: '100%', 
    paddingVertical: 10, 
    borderRadius: 25, 
    alignItems: 'center' 
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnSub: { color: '#A5D6A7', fontSize: 9, marginTop: 2 },

  bottomContent: {
    marginTop: 'auto',
    marginBottom: 110, 
    paddingHorizontal: 20,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)', 
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 20,
    paddingBottom: 20
  },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
  waterBtn: { flexDirection: 'row', backgroundColor: '#1B3C1B', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, alignItems: 'center', elevation: 3 },
  waterText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  fertilizeBtn: { flexDirection: 'row', backgroundColor: '#FFCCBC', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, alignItems: 'center', elevation: 3 },
  fertilizeText: { color: '#5D4037', fontWeight: 'bold', fontSize: 13 },

  growthSection: { paddingHorizontal: 15 },
  growthHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  growthText: { fontWeight: 'bold', color: '#1B3C1B', fontSize: 13 },
  growthPercent: { fontWeight: 'bold', color: '#5D4037', fontSize: 13 },
  
  progressBarBg: { height: 12, backgroundColor: 'rgba(200, 230, 201, 0.8)', borderRadius: 6, position: 'relative', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1B3C1B', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  progressDot: { position: 'absolute', right: 5, top: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD600' },

  bottomTab: { position: 'absolute', bottom: 0, width: '100%', height: 75, backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30, zIndex: 10 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#fff' },
  centerBtnText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
