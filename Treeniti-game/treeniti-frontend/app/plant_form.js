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
  Alert,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

export default function PlantForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handlePlantSeed = async () => {
    if (!name.trim()) {
        Alert.alert("Name Required", "Please give your new plant a name!");
        return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Not Logged In", "You must be logged in to plant a tree.");
        return;
      }

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
        Alert.alert("🌱 SUCCESS!", `Your shiny new tree "${data.tree.treeName}" seed has been planted!`, [
            { text: "AWESOME!", onPress: () => router.replace('/plant') }
        ]);
      } else {
        Alert.alert("Limit Reached", data.error || "You cannot plant more trees right now.");
      }
    } catch (e) {
      Alert.alert("Network Error", "Unable to connect to backend server.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../assets/image.png')} style={styles.bgImage} blurRadius={Platform.OS === 'ios' ? 10 : 5}>
        <LinearGradient colors={['rgba(0,40,0,0.8)', 'rgba(0,20,0,0.4)', 'rgba(0,0,0,0.9)']} style={styles.overlay}>
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexContainer}>
            
            {/* --- Custom Floating Header --- */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>New Plantation</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.formContainer}>
              {/* --- Icon Box --- */}
              <View style={styles.iconCircle}>
                <LinearGradient colors={['#FFD700', '#F9A825']} style={styles.iconCircleInner}>
                    <FontAwesome5 name="seedling" size={40} color="#1B3C1B" />
                </LinearGradient>
              </View>

              <Text style={styles.mainTitle}>Start Your Journey</Text>
              <Text style={styles.mainSub}>Name your digital seed and watch it grow into a real tree.</Text>

              {/* --- Premium Input Field --- */}
              <View style={[styles.inputWrapper, isFocused && styles.inputWrapperActive]}>
                <View style={styles.inputIcon}>
                    <MaterialCommunityIcons name="tag-outline" size={22} color={isFocused ? "#FFD700" : "rgba(255,255,255,0.4)"} />
                </View>
                <TextInput 
                  style={styles.input} 
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter Plant Name (e.g. My Mango Tree)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </View>

              {/* --- Action Button --- */}
              <TouchableOpacity style={styles.plantBtn} onPress={handlePlantSeed} activeOpacity={0.9}>
                <LinearGradient 
                    colors={['#2E7D32', '#1B5E20']} 
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={styles.plantBtnInner}
                >
                  <Text style={styles.plantBtnText}>PLANT SEED NOW</Text>
                  <Ionicons name="sparkles" size={18} color="#FFD700" />
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.limitHint}>Max 2 active trees allowed per user.</Text>
            </View>

          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  bgImage: { width: width, height: height },
  overlay: { flex: 1 }, 
  flexContainer: { flex: 1, paddingHorizontal: 25 },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: 60, 
    paddingBottom: 20 
  },
  backBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },

  formContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingBottom: 50 
  },
  
  iconCircle: { width: 100, height: 100, borderRadius: 50, padding: 4, backgroundColor: 'rgba(255,215,0,0.2)', marginBottom: 25 },
  iconCircleInner: { flex: 1, borderRadius: 46, justifyContent: 'center', alignItems: 'center' },

  mainTitle: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  mainSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },

  inputWrapper: { 
    flexDirection: 'row', 
    width: '100%', 
    height: 65, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 20, 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
    paddingHorizontal: 15
  },
  inputWrapperActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '700' },

  plantBtn: { 
    width: '100%', 
    height: 60, 
    borderRadius: 20, 
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#2E7D32',
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  plantBtnInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  plantBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  limitHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginTop: 20 }
});
