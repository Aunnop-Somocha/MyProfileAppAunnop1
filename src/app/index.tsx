import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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

// Local Fallback Products Data
const localFallbackProducts: Product[] = [
  {
    id: '1',
    name: 'Nike Air Max 90',
    stock: 15,
    stock_text: '15 in stock',
    category: 'Shoes',
    location_count: 5,
    location_text: '5 stores',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
  },
  {
    id: '2',
    name: 'Nike Air Force 1',
    stock: 20,
    stock_text: '20 in stock',
    category: 'Shoes',
    location_count: 4,
    location_text: '4 stores',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200',
  },
  {
    id: '3',
    name: 'Nike Air Zoom Pegasus 39',
    stock: 8,
    stock_text: '8 in stock',
    category: 'Shoes',
    location_count: 2,
    location_text: '2 stores',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200',
  },
];

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(localFallbackProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Aunnop-Somocha/MyProfileAppAunnop1/master/products.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch from GitHub');
        }
        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Error fetching products from GitHub, using local fallback:', err);
        setError(err.message);
        setLoading(false);
      });
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

        {/* GitHub Sync Status Bar */}
        <View style={[
          styles.statusBarContainer,
          error ? styles.statusBarError : styles.statusBarSuccess
        ]}>
          {loading ? (
            <View style={styles.statusBarContent}>
              <ActivityIndicator size="small" color="#8B5CF6" style={{ marginRight: 6 }} />
              <Text style={styles.statusBarLoadingText}>Fetching products from GitHub...</Text>
            </View>
          ) : error ? (
            <Text style={styles.statusBarErrorText}>
              Using Local Fallback (Push products.json to GitHub to sync)
            </Text>
          ) : (
            <Text style={styles.statusBarSuccessText}>
              Products synced live from GitHub!
            </Text>
          )}
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
  // Status Bar Styles
  statusBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  statusBarSuccess: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  statusBarError: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FCA5A5',
  },
  statusBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBarLoadingText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  statusBarSuccessText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  statusBarErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
});
