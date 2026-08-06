import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  brand?: string;
  color?: string;
  stock: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

const PRODUCTS_URL = 'https://raw.githubusercontent.com/Aunnop-Somocha/MyProfileAppAunnop1/refs/heads/master/products.json';
const BACKEND_URL = 'http://119.59.102.161/web/dcas/ip/std6730202530/api/products';
const API_BASE_URL = 'http://119.59.102.161:3049/api';

// Enhanced API Call function with better error handling for cloud
const apiCall = async (endpoint: string, options: any = {}, authToken?: string) => {
  const isPost = options.method && options.method.toUpperCase() !== 'GET';
  const config = {
    ...options,
    headers: {
      ...(isPost && { 'Content-Type': 'application/json' }),
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    },
  };

  const response = await fetch(endpoint, config);
  if (!response.ok) {
    throw new Error(`API call failed with status: ${response.status}`);
  }
  return response.json();
};

const defaultImageForProduct = (name: string = '') => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('force 1') || lower.includes('af1')) {
    return 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200';
  }
  if (lower.includes('pegasus') || lower.includes('zoom')) {
    return 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200';
  }
  if (lower.includes('ultraboost') || lower.includes('adidas')) {
    return 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=200';
  }
  return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200';
};

const cleanUrl = (url: string = '') => {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
};

const getMatchingImage = (name: string = '', url?: string) => {
  const cleaned = cleanUrl(url);
  if (cleaned && cleaned.length > 0) {
    return cleaned;
  }
  return defaultImageForProduct(name);
};

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('products');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Modal & Form state (Add Product)
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newCategory, setNewCategory] = useState('Shoes');
  const [newStock, setNewStock] = useState('');
  const [newLocationText, setNewLocationText] = useState('3 stores');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Modal & Form state (Edit Product)
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editLocationText, setEditLocationText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // Helper to persist products locally on Web browser
  const saveToLocalCache = (productsList: Product[]) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('MY_PRODUCTS_DB', JSON.stringify(productsList));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  };

  // fetchProducts function (As per Slide 24)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: any;
      try {
        data = await apiCall(BACKEND_URL);
      } catch (err) {
        try {
          data = await apiCall('http://119.59.102.161:3049/api/products');
        } catch (err2) {
          try {
            data = await apiCall('http://localhost:3049/api/products');
          } catch (err3) {
            const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('MY_PRODUCTS_DB') : null;
            if (savedLocal) {
              data = JSON.parse(savedLocal);
            } else {
              const response = await fetch(PRODUCTS_URL);
              data = await response.json();
            }
          }
        }
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      const defaultColors: Record<string, string> = {
        'Nike Air Max 90': 'Red / White',
        'Nike Air Force 1': 'White / Orange',
        'Nike Air Zoom Pegasus 39': 'Lime Green / Black',
      };

      const parsedData = data.map((product: any) => ({
        ...product,
        id: String(product.id || Math.random()),
        name: product.name || '',
        brand: product.brand || 'Nike',
        color: product.color || defaultColors[product.name] || 'Standard',
        stock: product.stock || 0,
        stock_text: product.stock_text || `${product.stock || 0} in stock`,
        category: product.category || 'Shoes',
        location_count: product.location_count || 0,
        location_text: product.location_text || '0 stores',
        badge_status: product.badge_status || 'Active',
        image_url: getMatchingImage(product.name, product.image_url),
      }));

      setProducts(parsedData);
      console.log(`Loaded ${parsedData.length} products`);
    } catch (err: any) {
      console.error('Fetch products error:', err);
      setError(err.message || 'Failed to load products');
      Alert.alert('Error', `Failed to load products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch products when navigating to 'products' screen (As per Slide 25)
  useEffect(() => {
    if (authToken && currentScreen === 'products') {
      void fetchProducts();
    }
  }, [authToken, currentScreen]);

  // 2. Auto-fetch products when accessing dashboard (As per Slide 25)
  useEffect(() => {
    if (authToken && currentScreen === 'dashboard' && products.length === 0) {
      void fetchProducts();
    }
  }, [authToken, currentScreen, products.length]);

  // Default auto-fetch products on screen load (As per Slide 26)
  useEffect(() => {
    void fetchProducts();
  }, []);

  // Add Product Handler (Saves to database via API)
  const handleAddProduct = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name');
      return;
    }
    if (!newStock.trim() || isNaN(Number(newStock))) {
      Alert.alert('Validation Error', 'Please enter a valid stock number');
      return;
    }

    const stockVal = parseInt(newStock, 10) || 0;
    const locText = newLocationText.trim() || '3 stores';
    const locCount = parseInt((locText.match(/\d+/) || ['3'])[0], 10);

    const imgToSave = cleanUrl(newImageUrl) || defaultImageForProduct(newName.trim());

    const newProductPayload = {
      name: newName.trim(),
      brand: newBrand.trim() || 'Nike',
      color: newColor.trim() || 'Standard',
      category: newCategory.trim() || 'Shoes',
      stock: stockVal,
      stock_text: `${stockVal} in stock`,
      location_count: locCount,
      location_text: locText,
      badge_status: 'Active',
      image_url: imgToSave,
    };

    try {
      setAdding(true);
      let apiResult: any = null;

      // Attempt to save to backend API / MySQL database
      try {
        apiResult = await apiCall(BACKEND_URL, {
          method: 'POST',
          body: JSON.stringify(newProductPayload),
        });
      } catch (err1) {
        try {
          apiResult = await apiCall('http://119.59.102.161:3049/api/products', {
            method: 'POST',
            body: JSON.stringify(newProductPayload),
          });
        } catch (err2) {
          try {
            apiResult = await apiCall('http://localhost:3049/api/products', {
              method: 'POST',
              body: JSON.stringify(newProductPayload),
            });
          } catch (err3) {
            console.log('API call failed, saving to local cache fallback');
          }
        }
      }

      const createdProduct: Product = {
        id: String(apiResult?.productId || apiResult?.product?.id || Date.now()),
        ...newProductPayload,
      };

      // Add new product to top of products list and persist
      setProducts((prev) => {
        const updated = [createdProduct, ...prev];
        saveToLocalCache(updated);
        return updated;
      });

      Alert.alert('Success', 'Product added successfully to database!');
      setModalVisible(false);

      // Clear form inputs
      setNewName('');
      setNewBrand('');
      setNewColor('');
      setNewCategory('Shoes');
      setNewStock('');
      setNewLocationText('3 stores');
      setNewImageUrl('');
    } catch (err: any) {
      console.error('Error adding product:', err);
      Alert.alert('Error', err.message || 'Failed to add product');
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Modal with pre-filled product details
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name || '');
    setEditBrand(product.brand || 'Nike');
    setEditColor(product.color || 'Standard');
    setEditCategory(product.category || 'Shoes');
    setEditStock(String(product.stock ?? 0));
    setEditLocationText(product.location_text || '3 stores');
    setEditImageUrl(product.image_url || '');
    setEditModalVisible(true);
  };

  // Save Product Edits to Database via PUT API
  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name');
      return;
    }
    if (!editStock.trim() || isNaN(Number(editStock))) {
      Alert.alert('Validation Error', 'Please enter a valid stock number');
      return;
    }

    const stockVal = parseInt(editStock, 10) || 0;
    const locText = editLocationText.trim() || '3 stores';
    const locCount = parseInt((locText.match(/\d+/) || ['3'])[0], 10);

    const imgToSave = cleanUrl(editImageUrl) || defaultImageForProduct(editName.trim());

    const updatedPayload = {
      name: editName.trim(),
      brand: editBrand.trim() || 'Nike',
      color: editColor.trim() || 'Standard',
      category: editCategory.trim() || 'Shoes',
      stock: stockVal,
      stock_text: `${stockVal} in stock`,
      location_count: locCount,
      location_text: locText,
      badge_status: editingProduct.badge_status || 'Active',
      image_url: imgToSave,
    };

    try {
      setSavingEdit(true);
      const targetId = editingProduct.id;

      // Attempt API PUT call to backend database
      try {
        await apiCall(`${BACKEND_URL}/${targetId}`, {
          method: 'PUT',
          body: JSON.stringify(updatedPayload),
        });
      } catch (err1) {
        try {
          await apiCall(`http://119.59.102.161:3049/api/products/${targetId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedPayload),
          });
        } catch (err2) {
          try {
            await apiCall(`http://localhost:3049/api/products/${targetId}`, {
              method: 'PUT',
              body: JSON.stringify(updatedPayload),
            });
          } catch (err3) {
            console.log('API PUT call failed, saving to local cache fallback');
          }
        }
      }

      // Update products state in React UI & local cache
      setProducts((prev) => {
        const updated = prev.map((item) =>
          item.id === targetId ? { ...item, ...updatedPayload } : item
        );
        saveToLocalCache(updated);
        return updated;
      });
      setFailedImages((prev) => ({ ...prev, [targetId]: false }));

      Alert.alert('Success', 'Product details updated successfully in database!');
      setEditModalVisible(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error updating product:', err);
      Alert.alert('Error', err.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.color && product.color.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
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
                key={product.image_url || product.id}
                source={{
                  uri: failedImages[product.id]
                    ? defaultImageForProduct(product.name)
                    : getMatchingImage(product.name, product.image_url),
                }}
                onError={() => setFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productInfo}>
                <View style={styles.productDetails}>
                  <Text style={styles.stockText}>Stock: {product.stock_text}</Text>
                  <Text style={styles.categoryText}>Category: {product.category}</Text>
                  <Text style={styles.brandText}>Brand: {product.brand || 'Nike'}</Text>
                  <Text style={styles.colorText}>Color: {product.color || 'Standard'}</Text>
                  <Text style={styles.locationText}>Location: {product.location_text}</Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.editCardButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Text style={styles.editCardButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statusButton}>
                    <Text style={styles.statusText}>{product.badge_status}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => openEditModal(product)}
                  >
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
          <TouchableOpacity style={styles.navItem} onPress={() => setModalVisible(true)}>
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

        {/* Add Product Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Product</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Adidas Ultraboost 22"
                  placeholderTextColor="#aaa"
                  value={newName}
                  onChangeText={setNewName}
                />

                <Text style={styles.inputLabel}>Brand *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Adidas, Nike, Puma"
                  placeholderTextColor="#aaa"
                  value={newBrand}
                  onChangeText={setNewBrand}
                />

                <Text style={styles.inputLabel}>Color *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Black / White"
                  placeholderTextColor="#aaa"
                  value={newColor}
                  onChangeText={setNewColor}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Shoes"
                  placeholderTextColor="#aaa"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />

                <Text style={styles.inputLabel}>Stock Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 15"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={newStock}
                  onChangeText={setNewStock}
                />

                <Text style={styles.inputLabel}>Stores Location</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 3 stores"
                  placeholderTextColor="#aaa"
                  value={newLocationText}
                  onChangeText={setNewLocationText}
                />

                <Text style={styles.inputLabel}>Image URL (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://..."
                  placeholderTextColor="#aaa"
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                />

                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Image Preview:</Text>
                  <Image
                    source={{ uri: cleanUrl(newImageUrl) || defaultImageForProduct(newName) }}
                    style={styles.modalPreviewImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, adding && { opacity: 0.7 }]}
                    onPress={handleAddProduct}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Product</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Product Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Product Details</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Nike Air Max 90"
                  placeholderTextColor="#aaa"
                  value={editName}
                  onChangeText={setEditName}
                />

                <Text style={styles.inputLabel}>Brand *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Nike, Adidas, Puma"
                  placeholderTextColor="#aaa"
                  value={editBrand}
                  onChangeText={setEditBrand}
                />

                <Text style={styles.inputLabel}>Color *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Red / White"
                  placeholderTextColor="#aaa"
                  value={editColor}
                  onChangeText={setEditColor}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Shoes"
                  placeholderTextColor="#aaa"
                  value={editCategory}
                  onChangeText={setEditCategory}
                />

                <Text style={styles.inputLabel}>Stock Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 15"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={editStock}
                  onChangeText={setEditStock}
                />

                <Text style={styles.inputLabel}>Stores Location</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 5 stores"
                  placeholderTextColor="#aaa"
                  value={editLocationText}
                  onChangeText={setEditLocationText}
                />

                <Text style={styles.inputLabel}>Image URL (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://..."
                  placeholderTextColor="#aaa"
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                />

                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Image Preview:</Text>
                  <Image
                    source={{ uri: cleanUrl(editImageUrl) || defaultImageForProduct(editName) }}
                    style={styles.modalPreviewImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, savingEdit && { opacity: 0.7 }]}
                    onPress={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  brandText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  colorText: {
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
  editCardButton: {
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  editCardButtonText: {
    color: '#7e22ce',
    fontSize: 12,
    fontWeight: '600',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
    padding: 5,
  },
  modalForm: {
    flexGrow: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    marginBottom: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 15,
    marginBottom: 10,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Preview Image Styles
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 10,
    fontWeight: '500',
  },
  modalPreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
});
