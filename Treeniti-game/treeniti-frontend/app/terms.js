import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Translations Object
const translations = {
  en: {
    header: "🎮 Game Rules & Policy",
    rules: [
      {
        title: "1. 🌳 Owner of Digital Garden",
        desc: "This app gives you a digital tree. The responsibility of this tree is entirely yours. If you don't water it on time, its growth might stop!"
      },
      {
        title: "2. 💧 Watering & Growth",
        desc: "You get limited water every day. Use the Shake-to-Water feature correctly. Manipulating sensors unfairly can lead to rewards being cancelled."
      },
      {
        title: "3. 🤝 Referral Squad",
        desc: "You can expand your 'Forest Community' by inviting friends. Every successful referral can earn you extra fertilizer or water."
      },
      {
        title: "4. 🚫 No Cheating!",
        desc: "Using auto-clickers or any hacking tools is forbidden. If detected, your 'Garden' will be banned permanently."
      },
      {
        title: "5. 🌍 Real Impact",
        desc: "Treeniti's aim is awareness. Every tree grown in the game represents your contribution to the environment."
      }
    ],
    footer: "*You can only step into the world of Treeniti by accepting these terms.*",
    btn: "Let's Play! 🚀"
  },
  hi: {
    header: "🎮 गेम के नियम और शर्तें",
    rules: [
      {
        title: "1. 🌳 डिजिटल गार्डन के मालिक",
        desc: "यह ऐप आपको एक डिजिटल पेड़ देता है। इस पेड़ की ज़िम्मेदारी पूरी तरह से आपकी है। अगर आपने इसे वक्त पर पानी नहीं दिया, तो इसकी बढ़त रुक सकती है!"
      },
      {
        title: "2. 💧 पानी और विकास",
        desc: "आपको हर दिन सीमित पानी मिलता है। Shake-to-Water फीचर का सही इस्तेमाल करें। गलत तरीके से सेंसर के साथ छेड़छाड़ करने पर रिवॉर्ड्स रद्द किए जा सकते हैं।"
      },
      {
        title: "3. 🤝 रेफरल स्क्वाड",
        desc: "आप दोस्तों को इनवाइट करके अपनी 'फॉरेस्ट कम्युनिटी' बढ़ा सकते हैं। हर सफल रेफरल पर आपको एक्स्ट्रा खाद या पानी मिल सकता है।"
      },
      {
        title: "4. 🚫 कोई धोखाधड़ी नहीं!",
        desc: "ऑटो-क्लिकर्स या किसी भी हैकिंग टूल का उपयोग करना मना है। पकड़े जाने पर आपका 'गार्डन' हमेशा के लिए बैन कर दिया जाएगा।"
      },
      {
        title: "5. 🌍 वास्तविक प्रभाव",
        desc: "Treeniti का मकसद जागरूकता है। गेम में उगाया गया हर पेड़ पर्यावरण के प्रति आपके योगदान को दर्शाता है।"
      }
    ],
    footer: "*इन शर्तों को मान कर ही आप Treeniti की दुनिया में कदम रख सकते हैं।*",
    btn: "चलो, खेलते हैं! 🚀"
  }
};

export default function Terms() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('en');

  // 🔄 Memory se language load karo
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user-lang');
        if (savedLang) {
          setSelectedLang(savedLang);
        }
      } catch (e) {
        console.error("Failed to load language in Terms", e);
      }
    };
    loadLanguage();
  }, []);

  const t = translations[selectedLang];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t.header}</Text>
      
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {t.rules.map((rule, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.subHeader}>{rule.title}</Text>
            <Text style={styles.content}>{rule.desc}</Text>
          </View>
        ))}

        <Text style={styles.footerNote}>{t.footer}</Text>
      </ScrollView>

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.btnText}>{t.btn}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#F0FDF4', paddingTop: 60 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#166534', marginBottom: 20, textAlign: 'center' },
  scroll: { flex: 1 },
  card: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 15, 
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#22C55E'
  },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginBottom: 5 },
  content: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#166534', fontStyle: 'italic', marginVertical: 20 },
  closeBtn: { 
    backgroundColor: '#166534', 
    padding: 18, 
    borderRadius: 30, 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 8
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
