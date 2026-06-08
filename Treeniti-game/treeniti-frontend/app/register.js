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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';



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

export default function Register() {
  const router = useRouter();
  const { refCode } = useLocalSearchParams();
  const [reqId, setReqId] = useState('');

  useEffect(() => {
    if (OTPWidget && widgetId && tokenAuth) {
      try {
        OTPWidget.initializeWidget(widgetId, tokenAuth);
      } catch (err) {
        console.error("Failed to initialize MSG91 Widget:", err);
      }
    } else {
      console.warn("MSG91 SendOTP is missing widgetId/tokenAuth config OR running in simulation environment");
    }
  }, []);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    loginPassword: '',
    confirmPassword: '',
    inviteCode: ''
  });

  useEffect(() => {
    if (refCode) {
      setForm(prev => ({ ...prev, inviteCode: refCode }));
    }
  }, [refCode]);

  const [secure, setSecure] = useState({
    login: true,
    confirm: true
  });

  const [isOTPModalVisible, setOTPModalVisible] = useState(false);
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterPress = async () => {
    // Basic Validations
    if (!form.name || form.name.trim().length < 2) return Alert.alert("Error", "Please enter a valid Username (minimum 2 characters).");
    if (!form.mobile || form.mobile.length !== 10) return Alert.alert("Error", "Please enter valid 10-digit mobile number.");
    if (form.loginPassword !== form.confirmPassword) return Alert.alert("Error", "Login passwords do not match.");

    // Fallback to Simulation Mode if native module is not available or MSG91 keys are not configured in .env
    if (!OTPWidget || !widgetId || !tokenAuth) {
      setOTPModalVisible(true);
      Alert.alert("Simulation Mode", "MSG91 is not configured in .env or native module is not linked. Running in simulation mode.");
      return;
    }

    setLoading(true);
    try {
      const data = {
        identifier: '91' + form.mobile
      };
      console.log("Sending OTP with data:", data);
      const response = await OTPWidget.sendOTP(data);
      console.log("Send OTP Response:", response);
      
      const isSuccess = response && (
        response.reqId ||
        response.request_id ||
        response.type === 'success' ||
        (response.message && response.message.length > 8 && !response.message.includes('error'))
      );

      if (isSuccess) {
        const actualReqId = response.reqId || response.request_id || response.message;
        setReqId(actualReqId);
        setOTPModalVisible(true);
        Alert.alert("Success", "OTP sent successfully to +91 " + form.mobile);
      } else {
        Alert.alert(
          "OTP Failed",
          (response && response.message) || "Failed to send OTP.",
          [
            { text: "OK" }
          ]
        );
      }
    } catch (error) {
      console.error("Send OTP Error:", error);
      Alert.alert("Error", "Failed to send OTP: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!OTPWidget || !widgetId || !tokenAuth || !reqId) {
      Alert.alert("Resend OTP", "Resending OTP is not supported in simulation mode.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        reqId: reqId,
        retryChannel: 11 // 11 is SMS
      };
      console.log("Retrying OTP with body:", body);
      const response = await OTPWidget.retryOTP(body);
      console.log("Retry OTP Response:", response);
      Alert.alert("Success", "OTP has been resent to your mobile number.");
    } catch (error) {
      console.error("Retry OTP Error:", error);
      Alert.alert("Error", "Failed to resend OTP: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    if (!otp) return Alert.alert("Error", "Please enter the OTP.");
    
    setLoading(true);
    try {
      // 1. If MSG91 is not configured/linked in this environment, complete simulation registration
      if (!OTPWidget || !widgetId || !tokenAuth) {
        const backendResponse = await fetch(`${BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: form.mobile,
            otp: '123456', // Pass bypass master code internally to backend to complete session
            loginPassword: form.loginPassword,
            fundPassword: form.fundPassword,
            refCode: form.inviteCode,
            name: form.name
          })
        });

        const data = await backendResponse.json();
        if (data.success) {
          await AsyncStorage.setItem('userToken', data.token);
          Alert.alert("Success", "Welcome to Treeniti!", [
            { text: "Let's Play", onPress: () => router.replace('/home') }
          ]);
        } else {
          Alert.alert("Registration Failed", data.error || "Something went wrong");
        }
        return;
      }

      // 2. Otherwise, verify via MSG91
      const body = {
        reqId: reqId,
        otp: otp
      };
      console.log("Verifying OTP with body:", body);
      const response = await OTPWidget.verifyOTP(body);
      console.log("Verify OTP Response:", response);

      const isSuccess = response && (
        response.success || 
        response.type === 'success' || 
        response.message === 'Authentication succeeded' || 
        (response.message && response.message.toLowerCase().includes('success'))
      );

      if (isSuccess) {
        // Verification succeeded! Now call the backend with bypass OTP
        const backendResponse = await fetch(`${BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: form.mobile,
            otp: '123456', // Pass master bypass code since OTP is already verified on frontend
            loginPassword: form.loginPassword,
            fundPassword: form.fundPassword,
            refCode: form.inviteCode,
            name: form.name
          })
        });

        const data = await backendResponse.json();
        if (data.success) {
          await AsyncStorage.setItem('userToken', data.token);
          Alert.alert("Success", "Welcome to Treeniti!", [
            { text: "Let's Play", onPress: () => router.replace('/home') }
          ]);
        } else {
          Alert.alert("Registration Failed", data.error || "Something went wrong");
        }
      } else {
        Alert.alert("Verification Failed", (response && response.message) || "Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Verification Error:", error);
      Alert.alert("Error", "Cannot verify OTP: " + error.message);
    } finally {
      setLoading(false);
      setOTPModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header with Logo */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
                <Image source={require('../assets/treeniti_logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join Treeniti & Plant your first tree today!</Text>
            </View>
        </View>

        {/* Input Fields Style like Screenshot */}
        <View style={styles.formContainer}>
            <InputField 
                icon="person-outline" 
                placeholder="Please enter username (compulsory)" 
                value={form.name} 
                onChangeText={(t) => setForm({...form, name: t})}
                maxLength={30}
            />

            <InputField 
                icon="phone-portrait-outline" 
                placeholder="Please enter your phone number" 
                value={form.mobile} 
                onChangeText={(t) => setForm({...form, mobile: t})}
                keyboardType="numeric"
                maxLength={10}
                counter={`${form.mobile.length}/10`}
            />

            <InputField 
                icon="lock-closed-outline" 
                placeholder="Enter your login password" 
                value={form.loginPassword} 
                onChangeText={(t) => setForm({...form, loginPassword: t})}
                secureTextEntry={secure.login}
                toggle={() => setSecure({...secure, login: !secure.login})}
            />

            <InputField 
                icon="lock-closed-outline" 
                placeholder="Confirm your login password" 
                value={form.confirmPassword} 
                onChangeText={(t) => setForm({...form, confirmPassword: t})}
                secureTextEntry={secure.confirm}
                toggle={() => setSecure({...secure, confirm: !secure.confirm})}
            />

            <InputField 
                icon="people-outline" 
                placeholder="Enter invitation code" 
                value={form.inviteCode} 
                onChangeText={(t) => setForm({...form, inviteCode: t})}
                maxLength={12}
            />

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegisterPress}>
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient}>
                    <Text style={styles.btnText}>Register</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/')}>
                <Text style={styles.loginLinkText}>Already have an account? <Text style={{color: '#2563EB', fontWeight: 'bold'}}>Login</Text></Text>
            </TouchableOpacity>
        </View>
        <Text style={styles.versionText}>Treeniti - v1.0.3</Text>
      </ScrollView>

      {/* OTP MODAL */}
      <Modal visible={isOTPModalVisible} transparent animationType="slide">
          <View style={styles.modalBg}>
              <View style={styles.otpBox}>
                  <Text style={styles.otpTitle}>Verify Mobile</Text>
                  <Text style={styles.otpSub}>Enter digits sent to +91 {form.mobile}</Text>
                  <TextInput 
                    style={styles.otpInput} 
                    value={otp} 
                    onChangeText={setOTP} 
                    maxLength={6} 
                    keyboardType="numeric" 
                    placeholder="------"
                    placeholderTextColor="#ccc"
                  />
                  
                  <TouchableOpacity style={styles.verifyBtn} onPress={finalizeRegistration} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify & Join</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading} style={{marginTop: 15}}>
                      <Text style={{color: '#2563EB', fontWeight: 'bold'}}>Resend OTP via SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setOTPModalVisible(false)} style={{marginTop: 15}}>
                      <Text style={{color: '#999'}}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, toggle, counter, ...props }) => (
    <View style={styles.inputWrapper}>
        <View style={styles.inputBody}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={20} color="#666" />
            </View>
            <TextInput 
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                {...props}
            />
            {toggle && (
                <TouchableOpacity onPress={toggle} style={styles.toggleBtn}>
                    <Ionicons name={secureTextEntry ? "eye-off-outline" : "eye-outline"} size={20} color="#aaa" />
                </TouchableOpacity>
            )}
        </View>
        {counter && <Text style={styles.counterText}>{counter}</Text>}
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { paddingBottom: 40 },
  header: { padding: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginTop: 10 },
  logo: { width: 120, height: 120 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subtitle: { fontSize: 13, color: '#999', marginTop: 5 },

  formContainer: { paddingHorizontal: 25, marginTop: 20 },
  inputWrapper: { marginBottom: 18 },
  inputBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 60, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBox: { width: 30, alignItems: 'center', marginRight: 10 },
  input: { flex: 1, fontSize: 13, color: '#333' },
  toggleBtn: { padding: 10 },
  counterText: { textAlign: 'right', fontSize: 10, color: '#999', marginTop: 4, marginRight: 10 },

  registerBtn: { marginTop: 30, borderRadius: 25, overflow: 'hidden', height: 60, elevation: 5, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  loginLink: { marginTop: 25, alignItems: 'center' },
  loginLinkText: { fontSize: 13, color: '#666' },
  versionText: { textAlign: 'center', fontSize: 10, color: '#ccc', marginTop: 60 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  otpBox: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center' },
  otpTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  otpSub: { fontSize: 12, color: '#999', marginTop: 5, textAlign: 'center' },
  otpInput: { borderBottomWidth: 2, borderBottomColor: '#2563EB', width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 'bold', marginTop: 30, letterSpacing: 10, paddingBottom: 5 },
  otpHint: { fontSize: 10, color: '#FFB300', marginTop: 15, fontWeight: 'bold' },
  verifyBtn: { backgroundColor: '#2563EB', width: '100%', height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  verifyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
