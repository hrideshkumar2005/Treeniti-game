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

  // Forgot Password States
  const [isForgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotReqId, setForgotReqId] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSecure, setForgotSecure] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (OTPWidget && widgetId && tokenAuth) {
      try {
        OTPWidget.initializeWidget(widgetId, tokenAuth);
      } catch (err) {
        console.error("Failed to initialize MSG91 Widget:", err);
      }
    }
  }, []);

  useEffect(() => {
    let interval = null;
    if (isForgotPasswordModalVisible && forgotStep === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isForgotPasswordModalVisible, forgotStep, resendTimer]);

  const handleForgotSendOTP = async () => {
    if (!forgotMobile || forgotMobile.length !== 10) {
      return Alert.alert("Error", "Please enter a valid 10-digit mobile number.");
    }
    setForgotLoading(true);
    try {
      // 1. Check if user exists in our DB
      const checkRes = await fetch(`${BASE_URL}/auth/check-mobile?mobile=${forgotMobile}`);
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        setForgotLoading(false);
        return Alert.alert("Error", "This mobile number is not registered. Please register first.");
      }

      // 2. Call send-otp API on backend to store simulated/production OTP in backend store
      await fetch(`${BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: forgotMobile })
      });

      // 3. Send SMS via MSG91 if available, otherwise run in Simulation mode
      if (!OTPWidget || !widgetId || !tokenAuth) {
        Alert.alert("Simulation Mode", "OTP sent successfully (Simulated). Use 123456 or look at the backend console log.");
        setForgotStep(2);
        setResendTimer(90);
        setForgotLoading(false);
        return;
      }

      // If MSG91 is available, call the SendOTP widget
      const data = { identifier: '91' + forgotMobile };
      const response = await OTPWidget.sendOTP(data);
      const isSuccess = response && (
        response.reqId ||
        response.request_id ||
        response.type === 'success' ||
        (response.message && response.message.length > 8 && !response.message.includes('error'))
      );

      if (isSuccess) {
        const actualReqId = response.reqId || response.request_id || response.message;
        setForgotReqId(actualReqId);
        setForgotStep(2);
        setResendTimer(90);
        Alert.alert("Success", "OTP sent successfully to +91 " + forgotMobile);
      } else {
        Alert.alert("OTP Failed", (response && response.message) || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("Forgot OTP Error:", err);
      Alert.alert("Error", "Failed to send OTP: " + err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!forgotOtp) return Alert.alert("Error", "Please enter the OTP.");
    if (!forgotNewPassword) return Alert.alert("Error", "Please enter a new password.");
    if (forgotNewPassword !== forgotConfirmPassword) return Alert.alert("Error", "Passwords do not match.");

    setForgotLoading(true);
    try {
      let otpToSubmit = forgotOtp;

      // 1. If using MSG91, verify OTP via SDK first
      if (OTPWidget && widgetId && tokenAuth && forgotReqId) {
        const body = { reqId: forgotReqId, otp: forgotOtp };
        const response = await OTPWidget.verifyOTP(body);
        const isSuccess = response && (
          response.success || 
          response.type === 'success' || 
          response.message === 'Authentication succeeded' || 
          (response.message && response.message.toLowerCase().includes('success'))
        );

        if (!isSuccess) {
          setForgotLoading(false);
          return Alert.alert("Verification Failed", (response && response.message) || "Invalid OTP. Please try again.");
        }
        
        // If MSG91 verified it successfully, use the backend master bypass code
        otpToSubmit = '123456';
      }

      // 2. Call forgot-password endpoint on backend
      const resetRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: forgotMobile,
          otp: otpToSubmit,
          newPassword: forgotNewPassword
        })
      });

      const resetData = await resetRes.json();
      if (resetData.success) {
        Alert.alert("Success", "Password reset successful! Please login with your new password.");
        setForgotPasswordModalVisible(false);
        setForgotMobile('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotStep(1);
      } else {
        Alert.alert("Reset Failed", resetData.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Forgot Reset Error:", err);
      Alert.alert("Error", "Failed to reset password: " + err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (resendTimer > 0) return;

    setForgotLoading(true);
    try {
      // 1. Refresh OTP in backend store
      await fetch(`${BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: forgotMobile })
      });

      // 2. Resend via MSG91 if available, otherwise simulation fallback
      if (!OTPWidget || !widgetId || !tokenAuth || !forgotReqId) {
        Alert.alert("Simulation Mode", "OTP resent successfully (Simulated). Use 123456.");
        setResendTimer(90);
        return;
      }

      const body = {
        reqId: forgotReqId,
        retryChannel: 11
      };
      const response = await OTPWidget.retryOTP(body);
      const isSuccess = response && (
        response.success || 
        response.type === 'success' || 
        (response.message && response.message.toLowerCase().includes('success'))
      );

      if (isSuccess || response) {
        setResendTimer(90);
        Alert.alert("Success", "OTP has been resent to +91 " + forgotMobile);
      } else {
        Alert.alert("Error", (response && response.message) || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error("Forgot Resend OTP Error:", error);
      Alert.alert("Error", "Failed to resend OTP: " + error.message);
    } finally {
      setForgotLoading(false);
    }
  };

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

            <TouchableOpacity 
                style={{ alignSelf: 'flex-end', marginTop: -10, marginBottom: 15, marginRight: 5 }} 
                onPress={() => {
                  setForgotStep(1);
                  setForgotPasswordModalVisible(true);
                }}
            >
                <Text style={{ color: '#1B5E20', fontSize: 13, fontWeight: 'bold' }}>
                    {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                </Text>
            </TouchableOpacity>

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

      {/* Forgot Password Modal */}
      <Modal visible={isForgotPasswordModalVisible} transparent animationType="slide">
          <View style={styles.modalBg}>
              <View style={styles.otpBox}>
                  {forgotStep === 1 ? (
                    <>
                      <Text style={styles.otpTitle}>{language === 'hi' ? 'पासवर्ड भूल गए' : 'Forgot Password'}</Text>
                      <Text style={styles.otpSub}>{language === 'hi' ? 'पासवर्ड बदलने के लिए अपना मोबाइल नंबर दर्ज करें' : 'Enter your mobile to reset password'}</Text>
                      <TextInput 
                        style={styles.forgotInput} 
                        value={forgotMobile} 
                        onChangeText={setForgotMobile} 
                        maxLength={10} 
                        keyboardType="numeric" 
                        placeholder={language === 'hi' ? "मोबाइल नंबर" : "Mobile Number"}
                        placeholderTextColor="#ccc"
                      />
                      
                      <TouchableOpacity style={styles.verifyBtn} onPress={handleForgotSendOTP} disabled={forgotLoading}>
                          {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>{language === 'hi' ? 'ओटीपी भेजें' : 'Send OTP'}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setForgotPasswordModalVisible(false)} style={{marginTop: 15}}>
                          <Text style={{color: '#999'}}>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.otpTitle}>{language === 'hi' ? 'ओटीपी सत्यापित करें' : 'Verify OTP'}</Text>
                      <Text style={styles.otpSub}>{language === 'hi' ? `+91 ${forgotMobile} पर भेजा गया कोड दर्ज करें` : `Enter code sent to +91 ${forgotMobile}`}</Text>
                      
                      <TextInput 
                        style={styles.otpInput} 
                        value={forgotOtp} 
                        onChangeText={setForgotOtp} 
                        maxLength={6} 
                        keyboardType="numeric" 
                        placeholder="------"
                        placeholderTextColor="#ccc"
                      />

                      <TextInput 
                        style={styles.forgotInput} 
                        value={forgotNewPassword} 
                        onChangeText={setForgotNewPassword} 
                        secureTextEntry={forgotSecure}
                        placeholder={language === 'hi' ? "नया पासवर्ड" : "New Password"}
                        placeholderTextColor="#ccc"
                      />

                      <TextInput 
                        style={styles.forgotInput} 
                        value={forgotConfirmPassword} 
                        onChangeText={setForgotConfirmPassword} 
                        secureTextEntry={forgotSecure}
                        placeholder={language === 'hi' ? "पासवर्ड की पुष्टि करें" : "Confirm Password"}
                        placeholderTextColor="#ccc"
                      />

                      <TouchableOpacity onPress={() => setForgotSecure(!forgotSecure)} style={{ marginTop: 15, alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#1B5E20', fontSize: 12, fontWeight: 'bold' }}>
                            {forgotSecure ? (language === 'hi' ? 'पासवर्ड दिखाएं' : 'Show Passwords') : (language === 'hi' ? 'पासवर्ड छुपाएं' : 'Hide Passwords')}
                          </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.verifyBtn} onPress={handleForgotResetPassword} disabled={forgotLoading}>
                          {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>{language === 'hi' ? 'पासवर्ड बदलें' : 'Reset Password'}</Text>}
                      </TouchableOpacity>
                      
                      {resendTimer > 0 ? (
                        <Text style={{ color: '#666', marginTop: 15, fontSize: 13, fontWeight: 'bold' }}>
                          {language === 'hi' 
                            ? `ओटीपी पुनः भेजें (${resendTimer}s)` 
                            : `Resend OTP in ${resendTimer}s`}
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleForgotResendOtp} disabled={forgotLoading} style={{marginTop: 15}}>
                            <Text style={{color: '#2563EB', fontWeight: 'bold'}}>{language === 'hi' ? 'ओटीपी दोबारा भेजें' : 'Resend OTP'}</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity onPress={() => setForgotStep(1)} style={{marginTop: 15}}>
                          <Text style={{color: '#999'}}>{language === 'hi' ? 'पीछे जाएँ' : 'Go Back'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
              </View>
          </View>
      </Modal>
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  otpBox: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center' },
  otpTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  otpSub: { fontSize: 12, color: '#999', marginTop: 5, textAlign: 'center' },
  otpInput: { borderBottomWidth: 2, borderBottomColor: '#1B5E20', width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 'bold', marginTop: 20, letterSpacing: 10, paddingBottom: 5, marginBottom: 15 },
  forgotInput: { borderBottomWidth: 1, borderBottomColor: '#ccc', width: '100%', fontSize: 15, paddingVertical: 10, marginTop: 15, color: '#333' },
  verifyBtn: { backgroundColor: '#1B5E20', width: '100%', height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  verifyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
