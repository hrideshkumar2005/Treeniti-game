import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function LanguageSelect() {
  const router = useRouter();
  const { changeLanguage } = useLanguage();

  const handleLanguageSelect = async (langCode) => {
    // Save selection flag and update global context
    await AsyncStorage.setItem('languageSelected', 'true');
    await changeLanguage(langCode);
    
    // Check if token exists just in case
    const token = await AsyncStorage.getItem('userToken');
    if (token && token !== 'DEV_BYPASS_TOKEN') {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F7FFF7', '#E8F5E9']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.content}>
        <Image source={require('../assets/treeniti_logo.png')} style={styles.logo} resizeMode="contain" />
        
        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.subtitle}>अपनी भाषा चुनें</Text>
        
        <View style={styles.optionsContainer}>
          
          <TouchableOpacity 
            style={styles.langBtn} 
            activeOpacity={0.8}
            onPress={() => handleLanguageSelect('hi')}
          >
            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
              <Text style={styles.langTextHi}>हिन्दी</Text>
              <Text style={styles.subLangText}>Hindi</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.langBtn} 
            activeOpacity={0.8}
            onPress={() => handleLanguageSelect('en')}
          >
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient}>
              <Text style={styles.langTextEn}>English</Text>
              <Text style={styles.subLangText}>English</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        <Text style={styles.footerText}>You can change this later in your profile.</Text>
        <Text style={styles.footerTextHi}>आप इसे बाद में अपनी प्रोफाइल से बदल सकते हैं।</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 50,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  langBtn: {
    width: '100%',
    height: 70,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  langTextHi: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  langTextEn: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  subLangText: {
    fontSize: 14,
    color: '#E0F2F1',
    fontWeight: '500',
    opacity: 0.8,
  },
  footerText: {
    marginTop: 50,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footerTextHi: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  }
});
