import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ComingSoon() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- 🟢 Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
      </View>

      {/* --- ⚪ Main Content Area --- */}
      <View style={styles.content}>
        <Text style={styles.comingSoonText}>
          Products are{"\n"}Coming Soon!!
        </Text>
      </View>

      {/* --- 🟢 Fixed Bottom Navbar --- */}
      <View style={styles.bottomTab}>
        <TabItem icon="home" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Add Water" />
        
        <TouchableOpacity style={styles.centerBtn} activeOpacity={0.9} onPress={() => router.push('/upload_tree')}>
          <View style={styles.centerBtnInner}>
            <Ionicons name="add" size={28} color="#fff" />
            <Text style={styles.centerText}>PHOTO{"\n"}UPLOAD</Text>
          </View>
        </TouchableOpacity>

        <TabItem icon="leaf-outline" label="Add Fertilizer" />
        <TabItem icon="cash-outline" label="Earn More" onPress={() => router.push('/earn')} />
      </View>

    </SafeAreaView>
  );
}

// --- Tab Item Helper ---
const TabItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={styles.tabLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100, // Navbar ke liye space
  },
  comingSoonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    lineHeight: 40,
  },

  // --- Navbar Styles ---
  bottomTab: { position: 'absolute', bottom: 0, width: '100%', height: 75, backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#fff' },
  centerText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
