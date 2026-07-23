import { useState, useEffect } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Product {
  id: string;
  name: string;
  stock: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

const PRODUCTS_URL = 'https://raw.githubusercontent.com/Aunnop-Somocha/MyProfileAppAunnop1/refs/heads/master/products.json';
const BACKEND_URL = 'http://localhost:3049/products';

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(BACKEND_URL);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
          console.log('Successfully fetched products from local database.');
          return;
        }
      } catch (err) {
        console.log('Local backend server not available, fetching fallback products from GitHub.');
      }

      try {
        const response = await fetch(PRODUCTS_URL);
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching fallback products:', err);
      }
    }
    void loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>product</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#999"
              editable={true}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Filter ▼</Text>
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <Image
                source={
                  typeof product.image_url === 'string'
                    ? { uri: product.image_url }
                    : product.image_url
                }
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productInfo}>
                <View style={styles.productDetails}>
                  <Text style={styles.stockText}>Stock: {product.stock_text}</Text>
                  <Text style={styles.categoryText}>Category: {product.category}</Text>
                  <Text style={styles.locationText}>Location: {product.location_text}</Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity style={styles.statusButton}>
                    <Text style={styles.statusText}>{product.badge_status}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreIcon}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.productName}>{product.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>➕</Text>
            <Text style={styles.navText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📦</Text>
            <Text style={[styles.navText, { color: '#8B5CF6' }]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📂</Text>
            <Text style={styles.navText}>Categories</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  profileButton: {
    width: 30,
    height: 30,
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 16,
    color: 'white',
  },
  // Search Container Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 16,
    color: '#999',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  // Product List Styles
  productsList: {
    flex: 1,
    padding: 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productDetails: {
    flex: 1,
  },
  stockText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginRight: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    fontSize: 20,
    color: '#8B5CF6',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Bottom Navigation Styles
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
});
