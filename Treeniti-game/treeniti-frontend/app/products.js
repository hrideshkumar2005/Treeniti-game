import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const columnWidth = (width - 50) / 2; // Do columns ke liye width calculation

export default function Products() {
  const router = useRouter();

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
  bottomTab: { position: 'absolute', bottom: 0, width: '100%', height: 75, backgroundColor: '#6DBE71', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabBtn: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 8, color: '#fff', marginTop: 4, fontWeight: 'bold', textAlign: 'center' },
  centerBtn: { marginTop: -45, alignItems: 'center' },
  centerBtnInner: { width: 68, height: 68, backgroundColor: '#1B3C1B', borderRadius: 34, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#fff' },
  centerText: { fontSize: 6, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: -2 }
});
