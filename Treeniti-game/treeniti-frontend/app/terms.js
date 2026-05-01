import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const translations = {
  en: {
    header: "Terms & Conditions",
    lastUpdated: "Last Updated: May 2026",
    sections: [
      {
        icon: "leaf-outline",
        title: "1. Acceptance of Terms",
        desc: "By downloading, installing, or using the Treeniti application, you agree to be fully bound by these Terms & Conditions. If you do not agree to these terms, please do not use this application. Treeniti reserves the right to modify these terms at any time, and continued use of the app constitutes acceptance of any changes."
      },
      {
        icon: "person-outline",
        title: "2. Eligibility & Account",
        desc: "You must be at least 13 years of age to use Treeniti. Users under 18 years of age are not eligible for monetary withdrawals. You are responsible for maintaining the confidentiality of your account credentials. Each user may only create one account per mobile number. Multiple accounts may result in permanent banning."
      },
      {
        icon: "game-controller-outline",
        title: "3. Virtual Digital Tree & Gameplay",
        desc: "Treeniti grants you a non-transferable, non-exclusive license to use the digital tree within the app. The digital tree is a virtual game asset and has no real-world physical existence. Treeniti is not liable for any loss of in-game progress due to inactivity, technical errors, or violations of these terms."
      },
      {
        icon: "water-outline",
        title: "4. Daily Limits & Fair Usage",
        desc: "Each user is entitled to a defined number of watering sessions, fertilizer uses, and game interactions per day. These limits exist to ensure a fair experience for all users. Attempting to bypass daily limits through technical means, exploits, or bots is strictly prohibited and will result in account termination."
      },
      {
        icon: "cash-outline",
        title: "5. Rewards, Coins & Withdrawals",
        desc: "Coins earned in Treeniti are virtual rewards that may be redeemed for real monetary value, subject to the platform's prevailing conversion rate. Treeniti reserves the right to change the conversion rate at any time. Withdrawals are subject to a minimum threshold. Rewards obtained through fraudulent activity will be permanently forfeited. Monetary withdrawals are exclusively available for users 18 years of age or older."
      },
      {
        icon: "people-outline",
        title: "6. Referral Program",
        desc: "Treeniti offers a referral program where users can earn commissions by inviting new members. Commission earnings are based on the active participation of referred users. Treeniti reserves the right to terminate the referral program or modify commission rates at any time without prior notice. Any attempt to manipulate the referral system will result in disqualification."
      },
      {
        icon: "shield-checkmark-outline",
        title: "7. Anti-Fraud & Fair Play",
        desc: "Using automation tools, bots, emulators, auto-clickers, modified APKs, or any software to artificially gain rewards is strictly prohibited. Treeniti employs advanced fraud detection algorithms. If fraudulent activity is detected, your account will be permanently banned without any prior notice, and all accumulated rewards will be forfeited with no recourse."
      },
      {
        icon: "camera-outline",
        title: "8. Real Plantation Verification",
        desc: "Users who wish to claim rewards for real-world tree plantation must submit verifiable photo proofs. These proofs are subject to review and approval by our Admin team. Submitting false, edited, or misleading images is a serious violation. Treeniti reserves the right to reject claims that do not meet verification standards, and submitting fake proofs may result in account suspension."
      },
      {
        icon: "lock-closed-outline",
        title: "9. User Data & Privacy",
        desc: "Treeniti collects your mobile number, name, device ID, and optional location data solely for account security, fraud prevention, and service improvement. We do not sell your personal data to third parties. All data is handled in accordance with our Privacy Policy. By using this app, you consent to our data collection and processing practices."
      },
      {
        icon: "phone-portrait-outline",
        title: "10. Device Limitation",
        desc: "A maximum of 2 accounts are permitted per device. This policy is strictly enforced to prevent multi-accounting abuse. If more than the permitted number of accounts is detected on a single device, all associated accounts may be suspended or terminated at the discretion of Treeniti."
      },
      {
        icon: "trash-outline",
        title: "11. Account Deletion",
        desc: "Users may request account deletion through the Profile section. Account deletion requests are subject to Admin approval. Upon approval, your account data will be deactivated and you will lose all accumulated coins, rewards, and progress. Deleted accounts cannot be restored. Treeniti will retain certain data for legal compliance purposes even after deletion."
      },
      {
        icon: "alert-circle-outline",
        title: "12. Disclaimers & Liability",
        desc: "Treeniti is provided on an 'as-is' and 'as-available' basis. We make no warranties about the continuity, accuracy, or reliability of the service. Treeniti shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the app, including but not limited to loss of game data, rewards, or earnings."
      },
      {
        icon: "document-text-outline",
        title: "13. Google Play Compliance",
        desc: "Treeniti fully complies with all Google Play Store policies. This application does not promote gambling. All rewards are skill-based and tied to genuine in-app activities. The app is intended for environmental awareness and gamification purposes only. Users must be 13+ to use the app and 18+ for any monetary features."
      },
      {
        icon: "hammer-outline",
        title: "14. Termination",
        desc: "Treeniti reserves the right to suspend or terminate any user account at any time, with or without cause, including for violations of these Terms. Upon termination, your right to use the application ceases immediately. All provisions of these terms which by their nature should survive termination shall continue to apply after termination."
      },
      {
        icon: "globe-outline",
        title: "15. Governing Law",
        desc: "These Terms & Conditions are governed by the laws of India. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in India. If any provision of these terms is found to be unenforceable, the remaining provisions shall remain in full force and effect."
      },
    ],
    footer: "By tapping 'I Agree & Continue', you confirm that you have read, understood, and agree to be bound by these Terms & Conditions and our Privacy Policy.",
    btn: "✅ I Agree & Continue"
  },
  hi: {
    header: "नियम और शर्तें",
    lastUpdated: "अंतिम अपडेट: मई 2026",
    sections: [
      {
        icon: "leaf-outline",
        title: "1. शर्तों की स्वीकृति",
        desc: "Treeniti ऐप को डाउनलोड, इंस्टॉल या उपयोग करके, आप इन नियमों और शर्तों से पूरी तरह बाध्य होने के लिए सहमत होते हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो कृपया इस ऐप का उपयोग न करें। Treeniti किसी भी समय इन शर्तों को संशोधित करने का अधिकार सुरक्षित रखता है।"
      },
      {
        icon: "person-outline",
        title: "2. पात्रता और खाता",
        desc: "Treeniti का उपयोग करने के लिए आपकी आयु कम से कम 13 वर्ष होनी चाहिए। 18 वर्ष से कम आयु के उपयोगकर्ता मौद्रिक निकासी के लिए पात्र नहीं हैं। प्रत्येक उपयोगकर्ता केवल एक मोबाइल नंबर पर एक खाता बना सकता है। एकाधिक खाते स्थायी प्रतिबंध का कारण बन सकते हैं।"
      },
      {
        icon: "game-controller-outline",
        title: "3. डिजिटल पेड़ और गेमप्ले",
        desc: "Treeniti आपको ऐप के भीतर डिजिटल पेड़ का उपयोग करने के लिए एक गैर-हस्तांतरणीय, गैर-अनन्य लाइसेंस प्रदान करता है। डिजिटल पेड़ एक वर्चुअल गेम संपत्ति है और इसका वास्तविक दुनिया में कोई भौतिक अस्तित्व नहीं है।"
      },
      {
        icon: "water-outline",
        title: "4. दैनिक सीमाएं और उचित उपयोग",
        desc: "प्रत्येक उपयोगकर्ता को प्रतिदिन निर्धारित संख्या में वॉटरिंग सेशन, फर्टिलाइजर उपयोग और गेम इंटरैक्शन का अधिकार है। तकनीकी साधनों, एक्सप्लॉइट्स या बॉट्स के माध्यम से दैनिक सीमाओं को बायपास करने का प्रयास सख्त रूप से प्रतिबंधित है।"
      },
      {
        icon: "cash-outline",
        title: "5. रिवॉर्ड, कॉइन्स और निकासी",
        desc: "Treeniti में अर्जित कॉइन्स वर्चुअल पुरस्कार हैं जिन्हें प्लेटफ़ॉर्म की प्रचलित रूपांतरण दर के अधीन वास्तविक मौद्रिक मूल्य के लिए रिडीम किया जा सकता है। Treeniti किसी भी समय रूपांतरण दर बदलने का अधिकार सुरक्षित रखता है। धोखाधड़ी गतिविधि के माध्यम से प्राप्त पुरस्कार स्थायी रूप से जब्त कर लिए जाएंगे।"
      },
      {
        icon: "people-outline",
        title: "6. रेफरल प्रोग्राम",
        desc: "Treeniti एक रेफरल प्रोग्राम प्रदान करता है जहाँ उपयोगकर्ता नए सदस्यों को आमंत्रित करके कमीशन अर्जित कर सकते हैं। Treeniti किसी भी समय बिना पूर्व सूचना के रेफरल प्रोग्राम को समाप्त करने या कमीशन दरों को संशोधित करने का अधिकार सुरक्षित रखता है।"
      },
      {
        icon: "shield-checkmark-outline",
        title: "7. एंटी-फ्रॉड और फेयर प्ले",
        desc: "ऑटोमेशन टूल्स, बॉट्स, एमुलेटर्स, ऑटो-क्लिकर्स, मॉडिफाइड APK, या कृत्रिम रूप से पुरस्कार प्राप्त करने के लिए किसी भी सॉफ़्टवेयर का उपयोग सख्त रूप से प्रतिबंधित है। यदि धोखाधड़ी गतिविधि का पता चलता है, तो बिना किसी पूर्व सूचना के आपका खाता स्थायी रूप से प्रतिबंधित कर दिया जाएगा।"
      },
      {
        icon: "camera-outline",
        title: "8. वास्तविक वृक्षारोपण सत्यापन",
        desc: "वास्तविक वृक्षारोपण के लिए पुरस्कार का दावा करने वाले उपयोगकर्ताओं को सत्यापन योग्य फोटो प्रमाण जमा करने होंगे। झूठी, संपादित या भ्रामक छवियां जमा करना एक गंभीर उल्लंघन है और खाता निलंबन का कारण बन सकता है।"
      },
      {
        icon: "lock-closed-outline",
        title: "9. उपयोगकर्ता डेटा और गोपनीयता",
        desc: "Treeniti केवल खाता सुरक्षा, धोखाधड़ी की रोकथाम और सेवा सुधार के लिए आपका मोबाइल नंबर, नाम, डिवाइस ID और वैकल्पिक स्थान डेटा एकत्र करता है। हम आपका व्यक्तिगत डेटा तृतीय पक्षों को नहीं बेचते हैं।"
      },
      {
        icon: "phone-portrait-outline",
        title: "10. डिवाइस सीमा",
        desc: "प्रति डिवाइस अधिकतम 2 खातों की अनुमति है। यदि एक ही डिवाइस पर अनुमत संख्या से अधिक खाते पाए जाते हैं, तो सभी संबद्ध खाते निलंबित या समाप्त किए जा सकते हैं।"
      },
      {
        icon: "trash-outline",
        title: "11. खाता हटाना",
        desc: "उपयोगकर्ता प्रोफ़ाइल अनुभाग के माध्यम से खाता हटाने का अनुरोध कर सकते हैं। खाता हटाने के अनुरोध Admin अनुमोदन के अधीन हैं। अनुमोदन पर, आपके खाते का डेटा निष्क्रिय हो जाएगा और आप सभी संचित कॉइन्स, पुरस्कार और प्रगति खो देंगे।"
      },
      {
        icon: "alert-circle-outline",
        title: "12. अस्वीकरण और दायित्व",
        desc: "Treeniti 'जैसा है' और 'जैसा उपलब्ध है' आधार पर प्रदान किया जाता है। Treeniti गेम डेटा, पुरस्कार या आय के नुकसान सहित ऐप के आपके उपयोग से उत्पन्न किसी भी प्रत्यक्ष, अप्रत्यक्ष या परिणामी नुकसान के लिए उत्तरदायी नहीं होगा।"
      },
      {
        icon: "document-text-outline",
        title: "13. Google Play अनुपालन",
        desc: "Treeniti सभी Google Play Store नीतियों का पूरी तरह से पालन करता है। यह एप्लिकेशन जुए को बढ़ावा नहीं देता है। सभी पुरस्कार कौशल-आधारित हैं और वास्तविक इन-ऐप गतिविधियों से जुड़े हैं। ऐप केवल 13+ उम्र के उपयोगकर्ताओं के लिए है और मौद्रिक सुविधाओं के लिए 18+ आवश्यक है।"
      },
      {
        icon: "hammer-outline",
        title: "14. समाप्ति",
        desc: "Treeniti किसी भी समय, किसी भी कारण से, बिना या बिना सूचना के किसी भी उपयोगकर्ता खाते को निलंबित या समाप्त करने का अधिकार सुरक्षित रखता है। समाप्ति पर, एप्लिकेशन का उपयोग करने का आपका अधिकार तुरंत समाप्त हो जाता है।"
      },
      {
        icon: "globe-outline",
        title: "15. शासी कानून",
        desc: "ये नियम और शर्तें भारत के कानूनों द्वारा शासित हैं। इन शर्तों के तहत या उनके संबंध में उत्पन्न होने वाले किसी भी विवाद को भारत में स्थित न्यायालयों के अनन्य क्षेत्राधिकार के अधीन होगा।"
      },
    ],
    footer: "'मैं सहमत हूं और जारी रखें' पर टैप करके, आप पुष्टि करते हैं कि आपने इन नियमों और शर्तों और हमारी गोपनीयता नीति को पढ़ा, समझा और उनसे बाध्य होने के लिए सहमत हैं।",
    btn: "✅ मैं सहमत हूं और जारी रखें"
  }
};

export default function Terms() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedLang, setSelectedLang] = useState('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user-lang');
        if (savedLang) setSelectedLang(savedLang);
      } catch (e) {}
    };
    loadLanguage();
  }, []);

  const t = translations[selectedLang];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1B5E20" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.header}</Text>
          <Text style={styles.lastUpdated}>{t.lastUpdated}</Text>
        </View>
        {/* Language Toggle */}
        <View style={styles.langSwitch}>
          <TouchableOpacity
            onPress={() => setSelectedLang('en')}
            style={[styles.langBtn, selectedLang === 'en' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, selectedLang === 'en' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedLang('hi')}
            style={[styles.langBtn, selectedLang === 'hi' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, selectedLang === 'hi' && styles.langTextActive]}>हि</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {t.sections.map((section, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name={section.icon} size={18} color="#1B5E20" />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardDesc}>{section.desc}</Text>
          </View>
        ))}

        <View style={styles.footerCard}>
          <Ionicons name="information-circle-outline" size={20} color="#166534" />
          <Text style={styles.footerNote}>{t.footer}</Text>
        </View>
      </ScrollView>

      <View style={[styles.btnContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.agreeBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.agreeBtnText}>{t.btn}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  backBtn: { padding: 5 },
  headerCenter: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  lastUpdated: { fontSize: 10, color: '#888', marginTop: 1 },

  langSwitch: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 20, padding: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  langBtnActive: { backgroundColor: '#1B5E20' },
  langText: { fontSize: 12, fontWeight: 'bold', color: '#1B5E20' },
  langTextActive: { color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#1B5E20' },
  cardDesc: { fontSize: 13, color: '#4B5563', lineHeight: 21 },

  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 15,
    marginTop: 5,
    marginBottom: 10,
    gap: 10,
  },
  footerNote: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18, fontStyle: 'italic' },

  btnContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  agreeBtn: {
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
  },
  agreeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
