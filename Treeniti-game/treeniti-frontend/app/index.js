import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        // 🔒 AUTH CHECK: Redirect to home if token exists, else to login.
        setTimeout(() => {
          if (token && token !== 'DEV_BYPASS_TOKEN') {
            router.replace('/home');
          } else {
            router.replace('/login');
          }
        }, 2000);
      } catch (e) {
        router.replace('/login');
      }
    };
    checkSession();
  }, []);

  return (
    <LinearGradient colors={['#F7FFF7', '#E8F5E9']} style={styles.container}>
      <View style={styles.logoBox}>
        <Image source={require('../assets/treeniti_logo.png')} style={styles.logo} />
        <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Connecting to Nature...</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.brand}>TREENITI</Text>
        <Text style={styles.tagline}>Wellness • Community • Growth</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 100 },
  logoBox: { alignItems: 'center', marginTop: 40 },
  logo: { width: 180, height: 180, borderRadius: 90 },
  loaderBox: { marginTop: 40, alignItems: 'center' },
  loadingText: { color: '#1B5E20', fontSize: 14, fontWeight: '500', marginTop: 10, letterSpacing: 1 },
  footer: { alignItems: 'center' },
  brand: { fontSize: 36, fontWeight: '900', color: '#1B5E20', letterSpacing: 5 },
  tagline: { fontSize: 12, color: '#4CAF50', marginTop: 5, letterSpacing: 2 }
});
