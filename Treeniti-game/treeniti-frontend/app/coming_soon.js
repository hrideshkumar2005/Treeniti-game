import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ComingSoon() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      <View style={[styles.bottomTab, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TabItem icon="home-outline" label="Home" onPress={() => router.push('/home')} />
        <TabItem icon="water-outline" label="Water" onPress={() => router.push('/plant')} />
        
        <View style={styles.centerCol}>
          <TouchableOpacity style={styles.centerBtn} activeOpacity={0.85} onPress={() => router.push('/upload_tree')}>
            <LinearGradient
              colors={['#4CAF50', '#1B5E20']}
              style={styles.centerBtnInner}
            >
              <Ionicons name="camera" size={22} color="#fff" style={{ marginBottom: 1 }} />
              <Text style={styles.centerText}>UPLOAD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TabItem icon="leaf-outline" label="Fertilize" onPress={() => router.push('/plant')} />
        <TabItem icon="gift-outline" label="Earn" onPress={() => router.push('/earn')} />
      </View>

    </SafeAreaView>
  );
}

// --- Tab Item Helper ---
const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={styles.tabBtn}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={[styles.tabIconCircle, active && styles.activeTabIcon]}>
      <Ionicons name={icon} size={24} color={active ? "#1B5E20" : "#fff"} />
    </View>
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
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 9999
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -5 },
  tabIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  activeTabIcon: { backgroundColor: '#fff' },
  tabLabel: { fontSize: 9.5, color: '#fff', marginTop: 2, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -22, alignItems: 'center', zIndex: 10000 },
  centerBtnInner: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  centerText: { fontSize: 8, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 1, letterSpacing: 0.5 },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
