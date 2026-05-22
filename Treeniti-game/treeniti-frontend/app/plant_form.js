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
  StatusBar,
  Modal,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BASE_URL from '../config/api';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PlantForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Custom Alert Modal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'success', // 'success', 'limit', 'error'
    title: '',
    message: '',
    buttonText: 'OK',
    onPress: null
  });

  const showCustomAlert = (type, title, message, buttonText, onPress) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setAlertConfig({ type, title, message, buttonText, onPress });
    setAlertVisible(true);
  };

  const handlePlantSeed = async () => {
    if (!name.trim()) {
        showCustomAlert('error', 'Name Required 🏷️', 'Please give your new plant a name to start its journey!', 'GOT IT', null);
        return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showCustomAlert('error', 'Authentication Error 🔐', 'You must be logged in to plant a tree.', 'LOGIN', () => router.replace('/login'));
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
        showCustomAlert(
          'success',
          '🌱 PLANTED!',
          `Your shiny new tree seed "${data.tree.treeName}" has been successfully planted in your digital garden!`,
          'AWESOME!',
          () => router.replace('/plant')
        );
      } else {
        showCustomAlert(
          'limit',
          '🔒 LIMIT REACHED',
          data.error || "You have reached the maximum active virtual tree limit (2 trees). Grow one of your active trees to a 'Mature Tree' first!",
          'UNDERSTOOD',
          null
        );
      }
    } catch (e) {
      showCustomAlert('error', 'Network Error 🌐', 'Unable to connect to the backend server. Please check your internet connection.', 'TRY AGAIN', null);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../assets/image.jpg')} style={styles.bgImage} blurRadius={Platform.OS === 'ios' ? 10 : 5}>
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

      {/* --- GORGEOUS PREMIUM ALERT MODAL --- */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBgBlur} />
          
          <View style={[
            styles.modalContentCard,
            alertConfig.type === 'success' ? styles.borderSuccess :
            alertConfig.type === 'limit' ? styles.borderLimit : styles.borderError
          ]}>
            {/* Header Icon */}
            <View style={[
              styles.modalIconCircle,
              alertConfig.type === 'success' ? styles.bgSuccessCircle :
              alertConfig.type === 'limit' ? styles.bgLimitCircle : styles.bgErrorCircle
            ]}>
              <LinearGradient 
                colors={
                  alertConfig.type === 'success' ? ['#4CAF50', '#2E7D32'] :
                  alertConfig.type === 'limit' ? ['#FFA726', '#E65100'] : ['#EF5350', '#C62828']
                } 
                style={styles.modalIconCircleInner}
              >
                <Ionicons 
                  name={
                    alertConfig.type === 'success' ? 'checkmark-circle' :
                    alertConfig.type === 'limit' ? 'lock-closed' : 'alert-circle'
                  } 
                  size={38} 
                  color="#fff" 
                />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={[
              styles.modalTitle,
              alertConfig.type === 'success' ? styles.colorSuccess :
              alertConfig.type === 'limit' ? styles.colorLimit : styles.colorError
            ]}>
              {alertConfig.title}
            </Text>

            {/* Message */}
            <Text style={styles.modalMessage}>{alertConfig.message}</Text>

            {/* Premium Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.modalActionBtn}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setAlertVisible(false);
                if (alertConfig.onPress) {
                  alertConfig.onPress();
                }
              }}
            >
              <LinearGradient 
                colors={
                  alertConfig.type === 'success' ? ['#2E7D32', '#1B5E20'] :
                  alertConfig.type === 'limit' ? ['#E65100', '#BF360C'] : ['#C62828', '#B71C1C']
                } 
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={styles.modalActionBtnInner}
              >
                <Text style={styles.modalActionBtnText}>{alertConfig.buttonText}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  limitHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', marginTop: 20 },

  // --- PREMIUM ALERT MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)'
  },
  modalBgBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,30,0,0.15)'
  },
  modalContentCard: {
    width: width - 50,
    backgroundColor: '#151D15',
    borderRadius: 30,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  borderSuccess: { borderColor: '#4CAF50' },
  borderLimit: { borderColor: '#FFA726' },
  borderError: { borderColor: '#EF5350' },
  
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    marginBottom: 20
  },
  bgSuccessCircle: { backgroundColor: 'rgba(76,175,80,0.2)' },
  bgLimitCircle: { backgroundColor: 'rgba(255,167,38,0.2)' },
  bgErrorCircle: { backgroundColor: 'rgba(239,83,80,0.2)' },
  
  modalIconCircleInner: {
    flex: 1,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 15
  },
  colorSuccess: { color: '#81C784' },
  colorLimit: { color: '#FFB74D' },
  colorError: { color: '#E57373' },
  
  modalMessage: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10
  },
  
  modalActionBtn: {
    width: '100%',
    height: 55,
    borderRadius: 18,
    overflow: 'hidden'
  },
  modalActionBtnInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  modalActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2
  }
});
