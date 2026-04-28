import React, { useState } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const { t, language, changeLanguage } = useLanguage();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOTPVisible, setIsOTPVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoginPress = async () => {
    if (!mobile || mobile.length !== 10) {
        return Alert.alert("Error", "Please enter a valid 10-digit mobile number.");
    }
    // Demo Mode: Just show OTP field immediately
    setIsOTPVisible(true);
    Alert.alert("Demo Mode", "Please enter the universal demo OTP: 123456");
  };

  const finalizeLogin = async () => {
    if (otp !== '123456') return Alert.alert("Error", "Invalid OTP. Use 123456 for demo.");
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp })
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user._id);
        router.replace('/home');
      } else {
        Alert.alert("Login Failed", data.error || "User not found. Please register.");
      }
    } catch (error) {
      Alert.alert("Error", "Cannot connect to server.");
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

            {!isOTPVisible ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleLoginPress}>
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient}>
                        <Text style={styles.btnText}>{language === 'hi' ? 'ओटीपी प्राप्त करें' : 'Login with OTP'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            ) : (
                <View style={styles.otpSection}>
                    <TextInput 
                        style={styles.otpInput} 
                        placeholder={language === 'hi' ? "ओटीपी दर्ज करें" : "ENTER OTP (123456)"} 
                        placeholderTextColor="#ccc"
                        value={otp}
                        onChangeText={setOtp}
                        maxLength={6}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.primaryBtn} onPress={finalizeLogin} disabled={loading}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{language === 'hi' ? 'सत्यापित करें' : 'Verify & Login'}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsOTPVisible(false)} style={{marginTop: 15, alignItems: 'center'}}>
                         <Text style={{color: '#999'}}>{language === 'hi' ? 'नंबर बदलें' : 'Change Number'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>{language === 'hi' ? 'Treeniti में नए हैं?' : 'New to Treeniti?'}</Text>
                <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/register')}>
                <Text style={styles.secondaryBtnText}>{language === 'hi' ? 'नया खाता बनाएँ' : 'Create New Account'}</Text>
            </TouchableOpacity>
        </View>
        
        <Text style={styles.versionText}>v1.0.2 • Made with ❤️ for Nature</Text>
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

  primaryBtn: { marginTop: 10, borderRadius: 25, overflow: 'hidden', height: 60, elevation: 5, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  otpSection: { marginTop: 10 },
  otpInput: { backgroundColor: '#fff', borderRadius: 20, height: 60, textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 15, letterSpacing: 5, borderWidth: 1, borderColor: '#3B82F6' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 40 },
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
