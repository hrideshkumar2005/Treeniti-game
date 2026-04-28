import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Storage import kiya

export default function Onboarding() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('en');

  // Language save karke aage badhne ka logic
  const handleStart = async () => {
    try {
      // 💾 Language ko phone ki local memory mein save kar rahe hain
      await AsyncStorage.setItem('user-lang', selectedLang);
      
      // Ab login page par bhej do (ab params ki zarurat nahi, memory se uthayenge)
      router.push('/login');
    } catch (error) {
      console.error("Language save karne mein error: ", error);
      // Agar error aaye toh bhi normal navigate kar jao
      router.push('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/treeniti_logo.png')} style={styles.miniLogo} />
      
      <Text style={styles.title}>TREENITI</Text>
      
      <Text style={styles.instruction}>
        {selectedLang === 'en' ? 'Select Language' : 'भाषा चुनें'}
      </Text>

      {/* Language Selector Box */}
      <View style={styles.langBox}>
        <TouchableOpacity 
          style={selectedLang === 'en' ? styles.langBtnActive : styles.langBtn}
          onPress={() => setSelectedLang('en')}
        >
          <Text style={{ color: selectedLang === 'en' ? 'white' : '#666', fontWeight: 'bold' }}>
            English {selectedLang === 'en' ? '✓' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={selectedLang === 'hi' ? styles.langBtnActive : styles.langBtn}
          onPress={() => setSelectedLang('hi')}
        >
          <Text style={{ color: selectedLang === 'hi' ? 'white' : '#666', fontWeight: 'bold' }}>
            हिंदी {selectedLang === 'hi' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startText}>
          {selectedLang === 'en' ? 'Get Started →' : 'शुरू करें →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 100 },
  miniLogo: { width: 120, height: 120, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20', marginBottom: 20 },
  instruction: { fontSize: 16, color: '#666', marginBottom: 15 },
  langBox: { 
    flexDirection: 'row', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 30, 
    padding: 5, 
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  langBtnActive: { 
    backgroundColor: '#1B5E20', 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 25,
    elevation: 3
  },
  langBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 30 
  },
  startBtn: { 
    backgroundColor: '#1B5E20', 
    width: '85%', 
    padding: 18, 
    borderRadius: 30, 
    alignItems: 'center', 
    position: 'absolute', 
    bottom: 80,
    elevation: 5
  },
  startText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
