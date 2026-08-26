import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
  price?: number | string;
  sizes?: string;
  stock: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

interface UserProfile {
  id: number | string;
  username: string;
  role: 'admin' | 'user';
  name: string;
  token?: string;
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
  const [newPrice, setNewPrice] = useState('3500');
  const [newSizes, setNewSizes] = useState('US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12');
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
  const [editPrice, setEditPrice] = useState('');
  const [editSizes, setEditSizes] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editLocationText, setEditLocationText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // Modal & Delete state (Delete Product Popup)
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Success Popup Modal state
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [successModalTitle, setSuccessModalTitle] = useState<string>('');
  const [successModalMessage, setSuccessModalMessage] = useState<string>('');

  const showSuccessPopup = (title: string, message: string) => {
    setSuccessModalTitle(title);
    setSuccessModalMessage(message);
    setSuccessModalVisible(true);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  // User Auth & Role State (Default null to force Login Screen first)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('MY_AUTH_USER');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null; // Force Login Screen on initial entry
  });

  const [loginModalVisible, setLoginModalVisible] = useState<boolean>(false);
  const [selectedLoginRole, setSelectedLoginRole] = useState<'admin' | 'user'>('admin');
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';

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

      const rawRows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
      if (!rawRows) {
        throw new Error('Invalid data format received');
      }

      const defaultColors: Record<string, string> = {
        'Nike Air Max 90': 'Red / White',
        'Nike Air Force 1': 'White / Orange',
        'Nike Air Zoom Pegasus 39': 'Lime Green / Black',
      };

      const parsedData = rawRows.map((product: any) => ({
        ...product,
        id: String(product.id || Math.random()),
        name: product.name || '',
        brand: product.brand || 'Nike',
        color: product.color || defaultColors[product.name] || 'Standard',
        price: product.price !== undefined && product.price !== null ? Number(product.price) : 3500,
        sizes: product.sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12',
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
    const priceVal = parseFloat(newPrice) || 3500;
    const sizesVal = newSizes.trim() || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12';
    const locText = newLocationText.trim() || '3 stores';
    const locCount = parseInt((locText.match(/\d+/) || ['3'])[0], 10);

    const imgToSave = cleanUrl(newImageUrl) || defaultImageForProduct(newName.trim());

    const newProductPayload = {
      name: newName.trim(),
      brand: newBrand.trim() || 'Nike',
      color: newColor.trim() || 'Standard',
      price: priceVal,
      sizes: sizesVal,
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

      setModalVisible(false);

      // Clear form inputs
      setNewName('');
      setNewBrand('');
      setNewColor('');
      setNewPrice('3500');
      setNewSizes('US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12');
      setNewCategory('Shoes');
      setNewStock('');
      setNewLocationText('3 stores');
      setNewImageUrl('');

      showSuccessPopup('ทำการเพิ่มสินค้าสำเร็จแล้ว', `เพิ่มสินค้า "${createdProduct.name}" ลงในระบบเรียบร้อยแล้ว`);
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
    setEditPrice(String(product.price ?? 3500));
    setEditSizes(product.sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12');
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
    const priceVal = parseFloat(editPrice) || 3500;
    const sizesVal = editSizes.trim() || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12';
    const locText = editLocationText.trim() || '3 stores';
    const locCount = parseInt((locText.match(/\d+/) || ['3'])[0], 10);

    const imgToSave = cleanUrl(editImageUrl) || defaultImageForProduct(editName.trim());

    const updatedPayload = {
      name: editName.trim(),
      brand: editBrand.trim() || 'Nike',
      color: editColor.trim() || 'Standard',
      price: priceVal,
      sizes: sizesVal,
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

      setEditModalVisible(false);
      setEditingProduct(null);

      showSuccessPopup('ทำการแก้ไขสินค้าสำเร็จแล้ว', `บันทึกและอัปเดตข้อมูลสินค้า "${updatedPayload.name}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Error updating product:', err);
      Alert.alert('Error', err.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Confirmation Popup (Slide 8 frontend style)
  const confirmDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  };

  // Perform Delete API call (Slide 8 frontend handling)
  const handleDeleteProduct = async (product: Product) => {
    if (!product) return;
    setDeletingProductId(product.id);
    const targetId = product.id;

    try {
      // Call DELETE /api/products/:id API
      try {
        await apiCall(`${BACKEND_URL}/${targetId}`, { method: 'DELETE' });
      } catch (err1) {
        try {
          await apiCall(`http://119.59.102.161:3049/api/products/${targetId}`, { method: 'DELETE' });
        } catch (err2) {
          try {
            await apiCall(`http://localhost:3049/api/products/${targetId}`, { method: 'DELETE' });
          } catch (err3) {
            console.log('API DELETE call failed, updating local cache fallback');
          }
        }
      }

      // Filter out deleted product from list
      setProducts((prev) => {
        const updated = prev.filter((p) => p.id !== product.id);
        saveToLocalCache(updated);
        return updated;
      });

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(`Product "${product.name}" deleted successfully.`);
        }
      } else {
        Alert.alert('Success', `Product "${product.name}" deleted successfully.`);
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      Alert.alert('Delete failed', error?.message || 'Unable to delete product.');
    } finally {
      setDeletingProductId(null);
      setDeleteModalVisible(false);
      setProductToDelete(null);
    }
  };

  // Login Handler (API / Fallback)
  const handleLogin = async (customUser?: string, customPass?: string) => {
    const uName = customUser || loginUsername.trim();
    const uPass = customPass || loginPassword.trim();

    if (!uName || !uPass) {
      Alert.alert('Validation Error', 'Please enter username and password');
      return;
    }

    try {
      setLoggingIn(true);
      let data: any = null;

      try {
        data = await apiCall(BACKEND_URL.replace('/products', '/login'), {
          method: 'POST',
          body: JSON.stringify({ username: uName, password: uPass }),
        });
      } catch (err1) {
        try {
          data = await apiCall('http://119.59.102.161:3049/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: uName, password: uPass }),
          });
        } catch (err2) {
          try {
            data = await apiCall('http://localhost:3049/api/login', {
              method: 'POST',
              body: JSON.stringify({ username: uName, password: uPass }),
            });
          } catch (err3) {
            // Local fallback simulation if server is unreachable
            if (uName === 'admin' && uPass === 'admin123') {
              data = { token: 'mock-admin-token', user: { id: 1, username: 'admin', role: 'admin', name: 'Administrator' } };
            } else if (uName === 'user' && uPass === 'user123') {
              data = { token: 'mock-user-token', user: { id: 2, username: 'user', role: 'user', name: 'Normal User' } };
            } else {
              throw new Error('Invalid username or password');
            }
          }
        }
      }

      const userProfile: UserProfile = {
        ...data.user,
        token: data.token,
      };

      setCurrentUser(userProfile);
      if (userProfile.token) {
        setAuthToken(userProfile.token);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('MY_AUTH_USER', JSON.stringify(userProfile));
      }

      Alert.alert('Success', `Logged in successfully as ${userProfile.role.toUpperCase()} (${userProfile.name || userProfile.username})`);
      setLoginModalVisible(false);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Login Failed', err.message || 'Invalid username or password');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('MY_AUTH_USER');
    }
    Alert.alert('Logged Out', 'You have logged out.');
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.color && product.color.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Forced Login Screen if not logged in (Password Entry Required)
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.loginPageContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />
        <ScrollView contentContainerStyle={styles.loginScrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.loginCard}>
            <View style={styles.loginHeaderBox}>
              <View style={styles.loginLogoCircle}>
                <Text style={styles.loginLogoIcon}>👟</Text>
              </View>
              <Text style={styles.loginAppTitle}>Product Management App</Text>
              <Text style={styles.loginAppSubTitle}>Please select target role and enter password to sign in</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>🔒 Password Required</Text>
              </View>
            </View>

            {/* Role Selection Buttons */}
            <Text style={styles.selectAccountLabel}>1. Select Target Login Role:</Text>
            <View style={styles.roleTabContainer}>
              <TouchableOpacity
                style={[
                  styles.roleTabButton,
                  selectedLoginRole === 'admin' ? styles.roleTabActive : styles.roleTabInactive,
                ]}
                onPress={() => {
                  setSelectedLoginRole('admin');
                  setLoginUsername('admin');
                  setLoginPassword('');
                }}
              >
                <Text style={styles.roleTabIcon}>👑</Text>
                <Text
                  style={[
                    styles.roleTabText,
                    selectedLoginRole === 'admin' ? styles.roleTabTextActive : styles.roleTabTextInactive,
                  ]}
                >
                  Admin Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTabButton,
                  selectedLoginRole === 'user' ? styles.roleTabActive : styles.roleTabInactive,
                ]}
                onPress={() => {
                  setSelectedLoginRole('user');
                  setLoginUsername('user');
                  setLoginPassword('');
                }}
              >
                <Text style={styles.roleTabIcon}>👤</Text>
                <Text
                  style={[
                    styles.roleTabText,
                    selectedLoginRole === 'user' ? styles.roleTabTextActive : styles.roleTabTextInactive,
                  ]}
                >
                  User Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Permissions Hint Box */}
            <View
              style={[
                styles.roleHintBox,
                selectedLoginRole === 'admin' ? styles.adminHintBox : styles.userHintBox,
              ]}
            >
              <Text style={styles.roleHintTitle}>
                {selectedLoginRole === 'admin' ? '👑 Admin Role Privileges:' : '👤 User Role Privileges:'}
              </Text>
              <Text style={styles.roleHintText}>
                {selectedLoginRole === 'admin'
                  ? '✓ Can view, search, ADD new products, EDIT prices/sizes, and DELETE products.'
                  : '✓ Can view and search products only. (Add, Edit, and Delete actions are restricted)'}
              </Text>
            </View>

            {/* Password Login Form */}
            <Text style={styles.selectAccountLabel}>2. Enter Credentials & Password:</Text>
            <View style={styles.customLoginForm}>
              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter username"
                placeholderTextColor="#aaa"
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter password"
                placeholderTextColor="#aaa"
                secureTextEntry={true}
                value={loginPassword}
                onChangeText={setLoginPassword}
              />

              <TouchableOpacity
                style={[
                  styles.loginSubmitButton,
                  loggingIn && { opacity: 0.7 },
                ]}
                onPress={() => handleLogin(loginUsername, loginPassword)}
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.loginSubmitButtonText}>
                    Sign In as {selectedLoginRole.toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>SNEAKER VAULT</Text>
            <Text style={styles.roleBadgeHeader}>
              {isAdmin ? '👑 ADMIN MODE' : '👤 USER MODE'}
            </Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[
                styles.profileButton,
                { backgroundColor: '#000000' },
              ]}
              onPress={() => setLoginModalVisible(true)}
            >
              <Text style={styles.profileIcon}>{isAdmin ? '👑' : '👤'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerLogoutBtn} onPress={handleLogout}>
              <Text style={styles.headerLogoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
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
          {isAdmin && (
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add Product</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Filter ▼</Text>
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.cardHeaderRow}>
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
                <View style={styles.productMainMeta}>
                  <View style={styles.brandBadgeRow}>
                    <Text style={styles.brandPillText}>{(product.brand || 'Nike').toUpperCase()}</Text>
                    <Text style={styles.categoryPillText}>{product.category}</Text>
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.priceText}>฿{Number(product.price || 3500).toLocaleString('th-TH')}</Text>
                </View>
              </View>

              <View style={styles.sizePillContainer}>
                <Text style={styles.sizeLabel}>SIZES:</Text>
                <Text style={styles.sizePillText}>
                  {product.sizes || 'US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12'}
                </Text>
              </View>

              <View style={styles.cardFooterRow}>
                <View style={styles.metaInfoGroup}>
                  <Text style={styles.stockBadgeText}>📦 {product.stock_text}</Text>
                  <Text style={styles.colorBadgeText}>🎨 {product.color || 'Standard'}</Text>
                  <Text style={styles.locationBadgeText}>📍 {product.location_text}</Text>
                </View>

                <View style={styles.productActions}>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.editCardButton}
                      onPress={() => openEditModal(product)}
                    >
                      <Text style={styles.editCardButtonText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  )}
                  {isAdmin && (
                    <TouchableOpacity
                      style={[styles.deleteCardButton, deletingProductId === product.id && { opacity: 0.5 }]}
                      onPress={() => confirmDeleteProduct(product)}
                      disabled={deletingProductId === product.id}
                    >
                      {deletingProductId === product.id ? (
                        <ActivityIndicator size="small" color="#e11d48" />
                      ) : (
                        <Text style={styles.deleteCardButtonText}>🗑️ Delete</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  <View style={styles.statusBadgePill}>
                    <Text style={styles.statusText}>{product.badge_status}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          {isAdmin ? (
            <TouchableOpacity style={styles.navItem} onPress={() => setModalVisible(true)}>
              <Text style={styles.navIcon}>➕</Text>
              <Text style={styles.navText}>Add</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navItem} onPress={() => setLoginModalVisible(true)}>
              <Text style={styles.navIcon}>🔒</Text>
              <Text style={styles.navText}>Login</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📦</Text>
            <Text style={[styles.navText, { color: '#8B5CF6' }]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setLoginModalVisible(true)}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navText}>{currentUser ? currentUser.role.toUpperCase() : 'Account'}</Text>
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

                <Text style={styles.inputLabel}>Price (฿) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 3500"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />

                <Text style={styles.inputLabel}>Shoe Sizes (US 7 - 12) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12"
                  placeholderTextColor="#aaa"
                  value={newSizes}
                  onChangeText={setNewSizes}
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

                <Text style={styles.inputLabel}>Price (฿) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 3500"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={editPrice}
                  onChangeText={setEditPrice}
                />

                <Text style={styles.inputLabel}>Shoe Sizes (US 7 - 12) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. US 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12"
                  placeholderTextColor="#aaa"
                  value={editSizes}
                  onChangeText={setEditSizes}
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
        {/* Delete Confirmation Popup Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => {
            if (!deletingProductId) {
              setDeleteModalVisible(false);
              setProductToDelete(null);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteIconContainer}>
                <Text style={styles.deleteIconText}>🗑️</Text>
              </View>
              <Text style={styles.deleteModalTitle}>Confirm Delete Product</Text>
              <Text style={styles.deleteModalText}>
                {productToDelete
                  ? `Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`
                  : 'Are you sure you want to delete this product? This action cannot be undone.'}
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setProductToDelete(null);
                  }}
                  disabled={deletingProductId !== null}
                >
                  <Text style={styles.deleteCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteConfirmBtn, deletingProductId !== null && { opacity: 0.7 }]}
                  onPress={() => productToDelete && handleDeleteProduct(productToDelete)}
                  disabled={deletingProductId !== null}
                >
                  {deletingProductId !== null ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmBtnText}>Delete Product</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Success Alert Popup Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={successModalVisible}
          onRequestClose={() => setSuccessModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIconText}>✅</Text>
              </View>
              <Text style={styles.successModalTitle}>{successModalTitle || 'ดำเนินการสำเร็จ'}</Text>
              <Text style={styles.successModalText}>
                {successModalMessage || 'ระบบได้ทำการบันทึกข้อมูลเรียบร้อยแล้ว'}
              </Text>
              <TouchableOpacity
                style={styles.successConfirmBtn}
                onPress={() => setSuccessModalVisible(false)}
              >
                <Text style={styles.successConfirmBtnText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* User Login Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={loginModalVisible}
          onRequestClose={() => setLoginModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.loginModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Authentication & Account Role</Text>
                <TouchableOpacity onPress={() => setLoginModalVisible(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {currentUser ? (
                <View style={styles.currentProfileBox}>
                  <Text style={styles.currentProfileTitle}>Logged In As:</Text>
                  <View style={styles.profileBadgeRow}>
                    <Text style={[styles.profileRoleBadge, currentUser.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
                      {currentUser.role === 'admin' ? '👑 ADMIN' : '👤 USER'}
                    </Text>
                    <Text style={styles.profileNameText}>{currentUser.name || currentUser.username}</Text>
                  </View>
                  <Text style={styles.profilePermissionsText}>
                    {currentUser.role === 'admin'
                      ? '✅ Admin Privileges: Add Product, Edit Product, and Delete Product allowed'
                      : '👁️ Normal User: View and Search Products only (Add/Edit/Delete restricted)'}
                  </Text>
                  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>🚪 Log Out</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.loginSubTitle}>Sign In Credentials:</Text>

              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="admin or user"
                placeholderTextColor="#aaa"
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry={true}
                value={loginPassword}
                onChangeText={setLoginPassword}
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setLoginModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, loggingIn && { opacity: 0.7 }]}
                  onPress={() => handleLogin()}
                  disabled={loggingIn}
                >
                  {loggingIn ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#FFFFFF',
  },
  // Pure White Minimalist Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 16,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
  },
  roleBadgeHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginTop: 2,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#000000',
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 15,
    color: '#9CA3AF',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  // Pure White Minimalist Sneaker Product List Styles
  productsList: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productMainMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 23,
  },
  priceText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
  },
  sizePillContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  sizePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  stockBadgeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  colorBadgeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  locationBadgeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCardButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editCardButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteCardButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteCardButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgePill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  successModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successIconText: {
    fontSize: 28,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 8,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  successConfirmBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  successConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  deleteIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  deleteIconText: {
    fontSize: 26,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoutBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  headerLogoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  loginPageContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  loginHeaderBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loginLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  loginLogoIcon: {
    fontSize: 32,
  },
  loginAppTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  loginAppSubTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
    textAlign: 'center',
  },
  requiredBadge: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredBadgeText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  selectAccountLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  roleTabContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  roleTabActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  roleTabInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  roleTabIcon: {
    fontSize: 18,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  roleTabTextInactive: {
    color: '#4B5563',
  },
  roleHintBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adminHintBox: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E7EB',
  },
  userHintBox: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E7EB',
  },
  roleHintTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  roleHintText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  customLoginForm: {
    marginTop: 4,
  },
  loginSubmitButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  loginSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  loginSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
  },
  currentProfileBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  currentProfileTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileRoleBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#f3e8ff',
    color: '#7e22ce',
  },
  userBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  profileNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  profilePermissionsText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  presetAdminBtn: {
    flex: 1,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  presetUserBtn: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  presetBtnSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#94a3b8',
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
