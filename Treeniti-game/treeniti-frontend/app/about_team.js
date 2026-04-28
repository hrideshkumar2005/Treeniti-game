import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const teamData = {
  en: {
    title: "Meet Our Team",
    quote: "We are creating a digital revolution where every smartphone helps grow a forest.",
    members: [
      { id: 1, name: 'Alok Chaudhary', role: 'Founder', about: "I strongly believe that technology and nature should grow together.", image: require('../assets/user.png') },
      { id: 2, name: 'Vivek Chaudhary', role: 'CEO', about: "I lead operations and business growth at TREENITI.", image: require('../assets/user.png') },
      { id: 3, name: 'Akhand Pratap Singh', role: 'CTO', about: "I oversee the technical architecture of TREENITI.", image: require('../assets/user.png') },
      { id: 4, name: 'Aditya Choudhary', role: 'CMO', about: "I am shaping TREENITI’s digital identity.", image: require('../assets/user.png') },
    ]
  },
  hi: {
    title: "हमारी टीम",
    quote: "हम एक ऐसी डिजिटल क्रांति बना रहे हैं जहाँ हर स्मार्टफोन जंगल उगाने में मदद करता है।",
    members: [
      { id: 1, name: 'आलोक चौधरी', role: 'संस्थापक', about: "मेरा दृढ़ विश्वास है कि तकनीक और प्रकृति को साथ बढ़ना चाहिए।", image: require('../assets/user.png') },
      { id: 2, name: 'विवेक चौधरी', role: 'CEO', about: "मैं TREENITI में ऑपरेशन्स और बिजनेस ग्रोथ का नेतृत्व करता हूँ।", image: require('../assets/user.png') },
      { id: 3, name: 'अखंड प्रताप सिंह', role: 'CTO', about: "मैं TREENITI की तकनीकी संरचना की देखरेख करता हूँ।", image: require('../assets/user.png') },
      { id: 4, name: 'आदित्य चौधरी', role: 'CMO', about: "मैं TREENITI की डिजिटल पहचान बना रहा हूँ।", image: require('../assets/user.png') },
    ]
  }
};

export default function AboutTeam() {
  const router = useRouter();
  const [lang, setLang] = useState('en');

  // Load language from storage when page opens
  useEffect(() => {
    const loadLang = async () => {
      const saved = await AsyncStorage.getItem('user-lang');
      if (saved) setLang(saved);
    };
    loadLang();
  }, []);

  // Save and change language
  const toggleLang = async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem('user-lang', newLang);
  };

  const t = teamData[lang];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Language Switcher */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        
        {/* Universal Lang Toggle Button */}
        <TouchableOpacity 
          style={styles.langSwitchBtn} 
          onPress={() => toggleLang(lang === 'en' ? 'hi' : 'en')}
        >
          <Text style={styles.langSwitchText}>{lang === 'en' ? 'हिन्दी' : 'ENG'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.missionBrief}>
           <Text style={styles.quote}>"{t.quote}"</Text>
        </View>

        {t.members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.cardHeader}>
              <Image source={member.image} style={styles.avatar} />
              <View style={styles.nameBox}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={styles.roleBadge}><Text style={styles.roleText}>{member.role}</Text></View>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.aboutText}>{member.about}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FCF9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'space-between', backgroundColor: '#fff', elevation: 3 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  iconCircle: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 12 },
  
  langSwitchBtn: { backgroundColor: '#1B5E20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  langSwitchText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  scrollContent: { padding: 15, paddingBottom: 40 },
  missionBrief: { backgroundColor: '#1B5E20', padding: 25, borderRadius: 25, marginBottom: 25 },
  quote: { fontSize: 15, fontStyle: 'italic', color: '#fff', lineHeight: 22, textAlign: 'center' },
  memberCard: { backgroundColor: '#fff', borderRadius: 25, padding: 20, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  nameBox: { marginLeft: 15, flex: 1 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  roleBadge: { backgroundColor: '#F0F4F0', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  roleText: { fontSize: 10, color: '#1B5E20', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  aboutText: { fontSize: 14, color: '#555', lineHeight: 22 },
});
