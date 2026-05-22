import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';
import { useLanguage } from '../context/LanguageContext';



// Safe MSG91 SDK Import (Prevents crash in Expo Go / missing native module environment)
let OTPWidget = null;
try {
  OTPWidget = require('@msg91comm/sendotp-react-native').OTPWidget;
} catch (error) {
  console.warn("MSG91 SendOTP Native Module is not linked/available. Falling back to Simulation Mode.", error);
}

// MSG91 SendOTP Configuration
const widgetId = '366573726354373030383232';
const tokenAuth = process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN || '';

const { width } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const { t, language, changeLanguage } = useLanguage();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleLoginPress = async () => {
    if (!mobile || mobile.length !== 10) {
        return Alert.alert("Error", "Please enter a valid 10-digit mobile number.");
    }
    if (!password) {
        return Alert.alert("Error", "Please enter your password.");
    }
    
    setLoading(true);
    try {
        const backendResponse = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile, loginPassword: password }) 
        });

        const data = await backendResponse.json();
        if (data.success) {
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userId', data.user._id);
          router.replace('/home');
        } else {
          Alert.alert("Login Failed", data.error || "User not found or incorrect password.");
        }
    } catch (error) {
        console.error("Login Error:", error);
        Alert.alert("Error", "Failed to login: " + error.message);
    } finally {
        setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.langBar}>
            <TouchableOpacity 
                style={[styles.langBtn, language === 'en' && styles.langBtnActive]} 
                onPress={() => changeLanguage('en')}
            >
                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.langBtn, language === 'hi' && styles.langBtnActive]} 
                onPress={() => changeLanguage('hi')}
            >
                <Text style={[styles.langText, language === 'hi' && styles.langTextActive]}>हिन्दी</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image source={require('../assets/treeniti_logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>{language === 'hi' ? 'नमस्ते' : 'Welcome Back'}</Text>
                <Text style={styles.subtitle}>{language === 'hi' ? 'अपने डिजिटल जंगल को और बड़ा करें!' : "Let's keep growing your digital forest!"}</Text>
            </View>
        </View>

        <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
                <View style={styles.inputBody}>
                    <View style={styles.iconBox}>
                        <Ionicons name="phone-portrait-outline" size={20} color="#666" />
                    </View>
                    <TextInput 
                        style={styles.input}
                        placeholder={language === 'hi' ? "अपना मोबाइल नंबर दर्ज करें" : "Please enter your phone number"}
                        placeholderTextColor="#999"
                        value={mobile}
                        onChangeText={setMobile}
                        keyboardType="numeric"
                        maxLength={10}
                    />
                </View>
            </View>

            <View style={styles.inputWrapper}>
                <View style={styles.inputBody}>
                    <View style={styles.iconBox}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" />
                    </View>
                    <TextInput 
                        style={styles.input}
                        placeholder={language === 'hi' ? "पासवर्ड दर्ज करें" : "Enter your password"}
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                    />
                    <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)} style={styles.toggleBtn}>
                        <Ionicons name={secureTextEntry ? "eye-off-outline" : "eye-outline"} size={20} color="#aaa" />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleLoginPress} disabled={loading}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{language === 'hi' ? 'लॉग इन करें' : 'Login'}</Text>}
                </LinearGradient>
            </TouchableOpacity>
            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>{language === 'hi' ? 'Treeniti में नए हैं?' : 'New to Treeniti?'}</Text>
                <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/register')}>
                <Text style={styles.secondaryBtnText}>{language === 'hi' ? 'नया खाता बनाएँ' : 'Create New Account'}</Text>
            </TouchableOpacity>
        </View>
        
        <Text style={styles.versionText}>v1.0.3 • Made with ❤️ for Nature</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { paddingBottom: 40 },
  header: { padding: 40, alignItems: 'center', marginTop: 20 },
  logoContainer: { alignItems: 'center' },
  logo: { width: 130, height: 130 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20', marginTop: 15 },
  subtitle: { fontSize: 13, color: '#666', marginTop: 5, textAlign: 'center' },

  formContainer: { paddingHorizontal: 30, marginTop: 10 },
  inputWrapper: { marginBottom: 20 },
  inputBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, height: 65, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBox: { width: 30, alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },

  primaryBtn: { marginTop: 10, borderRadius: 25, overflow: 'hidden', height: 60, elevation: 5, shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toggleBtn: { padding: 10 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  orText: { marginHorizontal: 15, fontSize: 12, color: '#999' },

  secondaryBtn: { borderWidth: 2, borderColor: '#1B5E20', borderRadius: 25, height: 60, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { color: '#1B5E20', fontWeight: 'bold', fontSize: 15 },
  
  versionText: { textAlign: 'center', fontSize: 10, color: '#ccc', marginTop: 50 },

  langBar: { flexDirection: 'row', alignSelf: 'center', marginTop: 20, backgroundColor: '#eee', borderRadius: 15, padding: 4 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
  langBtnActive: { backgroundColor: '#fff' },
  langText: { fontSize: 12, fontWeight: '700', color: '#999' },
  langTextActive: { color: '#1B5E20' },
});
