import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const columnWidth = (width - 50) / 2; // Do columns ke liye width calculation

export default function Products() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Mock Data for Products
  const productData = [
    { id: 1, name: "Product Name", price: "565", img: require('../assets/tree_mature.png') },
    { id: 2, name: "Product Name", price: "565", img: require('../assets/tree_mature.png') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- 🟢 Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- 🛍️ Product Grid --- */}
        <View style={styles.gridContainer}>
          {productData.map((item) => (
            <View key={item.id} style={styles.productCard}>
              {/* Product Image */}
              <Image source={item.img} style={styles.productImg} resizeMode="cover" />
              
              <View style={styles.infoBox}>
                <Text style={styles.productName}>{item.name}</Text>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>₹ {item.price}</Text>
                  
                  {/* 🔥 Updated: Ab ye Coming Soon page par bhejega */}
                  <TouchableOpacity 
                    style={styles.buyBtn} 
                    activeOpacity={0.8}
                    onPress={() => router.push('/coming_soon')}
                  >
                    <Text style={styles.buyBtnText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

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
  
  scrollContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 120 },

  // --- 🛍️ Grid Layout ---
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: columnWidth,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  productImg: {
    width: '100%',
    height: 140,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
  },
  infoBox: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  productName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  buyBtn: {
    backgroundColor: '#1B3C1B',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
