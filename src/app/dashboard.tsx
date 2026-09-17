import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ProductItem, runKMeans, KMeansOutput, ClusterResult } from '@/utils/kmeans';
import { KMeansChart } from '@/components/kmeans-chart';

const API_ENDPOINTS = [
  'http://119.59.102.161:3049/api/products',
  'http://119.59.102.161:3051/api/products',
  'http://119.59.102.161:3024/api/products',
  'http://119.59.102.161:3047/api/products',
  'http://119.59.102.161:3059/api/products',
  'http://119.59.102.161/web/dcas/ip/std6730202530/api/products',
  'https://raw.githubusercontent.com/Aunnop-Somocha/MyProfileAppAunnop1/refs/heads/master/products.json',
];

const INITIAL_FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: '1',
    name: 'Nike Air Max 90',
    brand: 'Nike',
    color: 'Red / White',
    price: 4500,
    stock: 15,
    category: 'Shoes',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
  },
  {
    id: '2',
    name: 'Nike Air Force 1',
    brand: 'Nike',
    color: 'White / Orange',
    price: 3800,
    stock: 20,
    category: 'Shoes',
    image_url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200',
  },
  {
    id: '3',
    name: 'Nike Air Zoom Pegasus 39',
    brand: 'Nike',
    color: 'Lime Green / Black',
    price: 4200,
    stock: 8,
    category: 'Shoes',
    image_url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200',
  },
  {
    id: '4',
    name: 'Adidas Ultraboost Light',
    brand: 'Adidas',
    color: 'Core Black',
    price: 6500,
    stock: 12,
    category: 'Running',
    image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=200',
  },
  {
    id: '5',
    name: 'Puma Velocity Nitro 2',
    brand: 'Puma',
    color: 'Electric Blue',
    price: 2900,
    stock: 25,
    category: 'Running',
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200',
  },
  {
    id: '6',
    name: 'Balenciaga Triple S',
    brand: 'Balenciaga',
    color: 'Multicolor',
    price: 38000,
    stock: 3,
    category: 'Luxury',
    image_url: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=200',
  },
  {
    id: '7',
    name: 'Converse Chuck Taylor 70',
    brand: 'Converse',
    color: 'Black / Egret',
    price: 2600,
    stock: 35,
    category: 'Casual',
    image_url: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=200',
  },
  {
    id: '8',
    name: 'Vans Old Skool Core',
    brand: 'Vans',
    color: 'Black / White',
    price: 2400,
    stock: 30,
    category: 'Casual',
    image_url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=200',
  },
  {
    id: '9',
    name: 'Jordan 1 Retro High OG',
    brand: 'Jordan',
    color: 'Chicago',
    price: 12500,
    stock: 5,
    category: 'Basketball',
    image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=200',
  },
  {
    id: '10',
    name: 'New Balance 990v5',
    brand: 'New Balance',
    color: 'Grey',
    price: 7900,
    stock: 10,
    category: 'Lifestyle',
    image_url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=200',
  },
];

export default function KMeansDashboardScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const [products, setProducts] = useState<ProductItem[]>(INITIAL_FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataScope, setDataScope] = useState<'OWN' | 'ALL'>('ALL');
  const [k, setK] = useState<number>(3);
  const [mode, setMode] = useState<'1D' | '2D'>('1D');
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

  // Modal State for Simulation (Adding/Editing Product Price)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [newProductStock, setNewProductStock] = useState<string>('10');
  const [newProductCategory, setNewProductCategory] = useState<string>('Custom');

  // Load products from API
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    let fetched: ProductItem[] = [];

const extractProductItems = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.result)) return data.result;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.data && Array.isArray(data.data.products)) return data.data.products;
  return [];
};

    const fetchPromises = API_ENDPOINTS.map(async (url) => {
      try {
        const portMatch = url.match(/:(\d+)\//);
        const portStr = portMatch ? `P${portMatch[1]}` : 'Remote';
        let response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok && url.includes('/api/products')) {
          const secondaryUrl = url.replace('/api/products', '/products');
          response = await fetch(secondaryUrl, { headers: { Accept: 'application/json' } });
        }
        if (response.ok) {
          const data = await response.json();
          const itemsRaw = extractProductItems(data);
          if (itemsRaw.length > 0) {
            return itemsRaw.map((item: any, idx: number) => {
              const name =
                item.name ||
                item.product_name ||
                item.productName ||
                item.title ||
                item.name_th ||
                item.name_en ||
                item.model ||
                `Product ${idx + 1}`;

              const rawPrice = item.price ?? item.Price ?? item.unit_price ?? item.cost;
              const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice || '3500') || 3500;
              const priceVal = isNaN(parsedPrice) || parsedPrice <= 0 ? 3500 : parsedPrice;

              const rawStock = item.stock ?? item.Stock ?? item.quantity ?? item.qty ?? item.count;
              const parsedStock = typeof rawStock === 'number' ? rawStock : parseInt(rawStock || '10', 10) || 10;
              const stockVal = isNaN(parsedStock) ? 0 : parsedStock;

              const rawImg =
                item.image_url ||
                item.imageUrl ||
                item.image ||
                item.img ||
                item.picture ||
                item.photo ||
                item.image_path ||
                item.src ||
                item.cover ||
                item.thumbnail;

              const validImg =
                rawImg && typeof rawImg === 'string' && rawImg.trim().length > 0 && !rawImg.includes('example.com') && !rawImg.includes('placeholder')
                  ? rawImg.trim().startsWith('http')
                    ? rawImg.trim()
                    : rawImg.trim().startsWith('/')
                    ? `http://119.59.102.161${rawImg.trim()}`
                    : `https://${rawImg.trim()}`
                  : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';

              const origId = String(item.id || item.product_id || item._id || idx + 1);

              return {
                id: `${portStr}_${origId}`,
                name: name,
                brand: item.brand || item.Brand || 'Brand',
                color: item.color || item.Color || 'Standard',
                price: priceVal,
                stock: stockVal,
                category: item.category || item.Category || item.type || 'General',
                location_text: item.location_text || portStr,
                badge_status: item.badge_status || portStr,
                image_url: validImg,
              };
            });
          }
        }
      } catch (err) {
        console.log(`Failed to fetch from ${url}`);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    results.forEach((items) => {
      fetched.push(...items);
    });

    if (fetched.length > 0) {
      setProducts(fetched);
    } else {
      setProducts(INITIAL_FALLBACK_PRODUCTS);
    }
    setLoading(false);
  };

  // Strict filter for Port 3049 products only
  const ownProductsList = useMemo(() => {
    return products.filter(
      (p) =>
        p.id.startsWith('P3049_') ||
        p.id.startsWith('Port_3049_') ||
        p.location_text === 'P3049' ||
        p.location_text === 'Port 3049' ||
        p.badge_status === 'P3049' ||
        p.badge_status === 'Port 3049'
    );
  }, [products]);

  // Filter products by selected scope (My Port 3049 vs All Ports)
  const activeProducts = useMemo(() => {
    if (dataScope === 'OWN') {
      return ownProductsList;
    }
    return products;
  }, [products, ownProductsList, dataScope]);

  // Run K-Means Clustering on active dataset
  const kMeansResult: KMeansOutput = useMemo(() => {
    return runKMeans(activeProducts, k, mode);
  }, [activeProducts, k, mode]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    if (!activeProducts.length) return { total: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, totalVal: 0 };
    const prices = activeProducts.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const sumP = prices.reduce((a, b) => a + b, 0);
    const totalV = activeProducts.reduce((a, b) => a + b.price * b.stock, 0);
    return {
      total: activeProducts.length,
      minPrice: minP,
      maxPrice: maxP,
      avgPrice: Math.round(sumP / activeProducts.length),
      totalVal: totalV,
    };
  }, [activeProducts]);

  // Filtered Products based on selected cluster card
  const activeClusterProducts = useMemo(() => {
    if (selectedClusterId === null) return null;
    return kMeansResult.clusters.find((c) => c.clusterId === selectedClusterId);
  }, [kMeansResult, selectedClusterId]);

  // Add custom product price to simulation
  const handleAddProduct = () => {
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const newProd: ProductItem = {
      id: `sim-${Date.now()}`,
      name: newProductName.trim() || `Simulated Item ฿${priceNum.toLocaleString()}`,
      brand: 'Simulation',
      color: 'Custom',
      price: priceNum,
      stock: parseInt(newProductStock, 10) || 10,
      category: newProductCategory || 'Test',
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    };

    setProducts((prev) => [newProd, ...prev]);
    setNewProductName('');
    setNewProductPrice('');
    setIsModalOpen(false);
  };

  const handleResetData = () => {
    fetchProducts();
    setSelectedClusterId(null);
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.six,
    },
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
        <View style={styles.mainWrapper}>
          {/* Header Section */}
          <View style={styles.headerBanner}>
            <View style={styles.headerTextGroup}>
              <View style={styles.badgeRow}>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Machine Learning</Text>
                </View>
                <View style={styles.algoBadge}>
                  <Text style={styles.algoBadgeText}>K-Means Algorithm</Text>
                </View>
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Product Price Clustering Dashboard
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                วิเคราะห์และจัดกลุ่มช่วงราคาสิค้าโดยอัตโนมัติด้วย K-Means Clustering
              </Text>
            </View>

            <TouchableOpacity style={styles.simulateBtn} onPress={() => setIsModalOpen(true)}>
              <Text style={styles.simulateBtnText}>+ Add Test Price</Text>
            </TouchableOpacity>
          </View>

          {/* Scope Selector: My Own Products vs All Ports Combined */}
          <View style={[styles.scopeSwitcherContainer, { backgroundColor: theme.backgroundElement }]}>
            <TouchableOpacity
              style={[styles.scopeTab, dataScope === 'ALL' && styles.scopeTabActive]}
              onPress={() => {
                setDataScope('ALL');
                setSelectedClusterId(null);
              }}>
              <Text style={[styles.scopeTabText, { color: theme.textSecondary }, dataScope === 'ALL' && styles.scopeTabTextActive]}>
                🌐 รวมสินค้าทุกพอร์ต (All 5 Ports)
              </Text>
              <View style={[styles.scopeBadge, dataScope === 'ALL' && styles.scopeBadgeActive]}>
                <Text style={[styles.scopeBadgeText, dataScope === 'ALL' && styles.scopeBadgeTextActive]}>
                  {products.length} Items
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scopeTab, dataScope === 'OWN' && styles.scopeTabActive]}
              onPress={() => {
                setDataScope('OWN');
                setSelectedClusterId(null);
              }}>
              <Text style={[styles.scopeTabText, { color: theme.textSecondary }, dataScope === 'OWN' && styles.scopeTabTextActive]}>
                👤 สินค้าของฉันคนเดียว (Port 3049)
              </Text>
              <View style={[styles.scopeBadge, dataScope === 'OWN' && styles.scopeBadgeActive]}>
                <Text style={[styles.scopeBadgeText, dataScope === 'OWN' && styles.scopeBadgeTextActive]}>
                  {ownProductsList.length} Items
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total Products</Text>
              <Text style={[styles.kpiValue, { color: theme.text }]}>{overallStats.total}</Text>
              <Text style={styles.kpiSub}>Items Analyzed</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Price Range</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                ฿{overallStats.minPrice.toLocaleString()} - ฿{overallStats.maxPrice.toLocaleString()}
              </Text>
              <Text style={styles.kpiSub}>Min - Max Price</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Average Price</Text>
              <Text style={[styles.kpiValue, { color: '#3B82F6' }]}>
                ฿{overallStats.avgPrice.toLocaleString()}
              </Text>
              <Text style={styles.kpiSub}>Mean Price Point</Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Inertia (WCSS)</Text>
              <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>
                {kMeansResult.wcss.toLocaleString()}
              </Text>
              <Text style={styles.kpiSub}>
                {kMeansResult.iterations} Iterations ({kMeansResult.converged ? 'Converged' : 'Max'})
              </Text>
            </View>
          </View>

          {/* Controls Bar: Select K and Mode */}
          <View style={[styles.controlsCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.controlGroup}>
              <Text style={[styles.controlTitle, { color: theme.text }]}>
                Clusters Count ($K$):
              </Text>
              <View style={styles.kButtonRow}>
                {[2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.kButton,
                      k === val && styles.kButtonActive,
                      { borderColor: k === val ? '#3B82F6' : theme.textSecondary },
                    ]}
                    onPress={() => {
                      setK(val);
                      setSelectedClusterId(null);
                    }}>
                    <Text
                      style={[
                        styles.kButtonText,
                        { color: k === val ? '#FFFFFF' : theme.text },
                      ]}>
                      K = {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.controlGroup}>
              <Text style={[styles.controlTitle, { color: theme.text }]}>Feature Mode:</Text>
              <View style={styles.kButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === '1D' && styles.modeButtonActive,
                  ]}
                  onPress={() => setMode('1D')}>
                  <Text style={[styles.modeButtonText, mode === '1D' && styles.modeTextActive]}>
                    1D (Price Only)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === '2D' && styles.modeButtonActive,
                  ]}
                  onPress={() => setMode('2D')}>
                  <Text style={[styles.modeButtonText, mode === '2D' && styles.modeTextActive]}>
                    2D (Price & Stock)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
              <Text style={styles.resetBtnText}>🔄 Reset Data</Text>
            </TouchableOpacity>
          </View>

          {/* K-Means Analytics Chart */}
          <KMeansChart
            kMeansResult={kMeansResult}
            overallMinPrice={overallStats.minPrice}
            overallMaxPrice={overallStats.maxPrice}
            mode={mode}
            theme={theme}
            onSelectCluster={(clusterId) => setSelectedClusterId(clusterId)}
          />

          {/* Cluster Cards Grid */}
          <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>
            Cluster Results ({kMeansResult.k} Price Groups)
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.clustersGrid}>
              {kMeansResult.clusters.map((cluster) => {
                const isSelected = selectedClusterId === cluster.clusterId;

                return (
                  <TouchableOpacity
                    key={cluster.clusterId}
                    activeOpacity={0.8}
                    style={[
                      styles.clusterCard,
                      { backgroundColor: theme.backgroundElement },
                      isSelected && { borderColor: cluster.color, borderWidth: 2 },
                    ]}
                    onPress={() =>
                      setSelectedClusterId(
                        isSelected ? null : cluster.clusterId
                      )
                    }>
                    <View style={styles.clusterCardHeader}>
                      <View
                        style={[styles.clusterColorBadge, { backgroundColor: cluster.color }]}>
                        <Text style={styles.clusterIdText}>C{cluster.clusterId}</Text>
                      </View>
                      <View style={styles.clusterTitleGroup}>
                        <Text style={[styles.clusterLabel, { color: theme.text }]}>
                          {cluster.label}
                        </Text>
                        <Text style={[styles.clusterCountText, { color: theme.textSecondary }]}>
                          {cluster.products.length} Products ({Math.round((cluster.products.length / products.length) * 100)}%)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.centroidMetricRow}>
                      <View style={styles.metricBox}>
                        <Text style={[styles.metricTitle, { color: theme.textSecondary }]}>
                          Centroid Price
                        </Text>
                        <Text style={[styles.metricValue, { color: cluster.color }]}>
                          ฿{cluster.centroidPrice.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.metricBox}>
                        <Text style={[styles.metricTitle, { color: theme.textSecondary }]}>
                          Price Range
                        </Text>
                        <Text style={[styles.metricValueSmall, { color: theme.text }]}>
                          ฿{cluster.minPrice.toLocaleString()} - ฿{cluster.maxPrice.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.clusterFooterRow}>
                      <Text style={[styles.clusterFooterText, { color: theme.textSecondary }]}>
                        Stock: {cluster.totalStock} units | Total Val: ฿{(cluster.totalValue / 1000).toFixed(1)}k
                      </Text>
                      <Text style={[styles.viewDetailsText, { color: cluster.color }]}>
                        {isSelected ? 'Hide Details ▲' : 'View Products ▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Active Cluster Products Detail View */}
          {activeClusterProducts && (
            <View style={[styles.detailSection, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.detailBadge,
                    { backgroundColor: activeClusterProducts.color },
                  ]}>
                  <Text style={styles.detailBadgeText}>
                    Group C{activeClusterProducts.clusterId}
                  </Text>
                </View>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {activeClusterProducts.label} — Products ({activeClusterProducts.products.length})
                </Text>
              </View>

              <View style={styles.productsTable}>
                {activeClusterProducts.products.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.productRow, { borderBottomColor: theme.background }]}>
                    <Image source={{ uri: item.image_url }} style={styles.productThumb} />
                    <View style={styles.productInfo}>
                      <Text style={[styles.productNameText, { color: theme.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.productSubText, { color: theme.textSecondary }]}>
                        Category: {item.category} | Brand: {item.brand} | Stock: {item.stock}
                      </Text>
                    </View>
                    <View style={styles.priceDistCol}>
                      <Text style={[styles.productPriceText, { color: activeClusterProducts.color }]}>
                        ฿{item.price.toLocaleString()}
                      </Text>
                      <Text style={[styles.distText, { color: theme.textSecondary }]}>
                        Δ {item.distanceToCentroid.toLocaleString()} from centroid
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Modal for Adding Test Product Price */}
        <Modal visible={isModalOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Product Price to Simulation
              </Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                ทดสอบใส่ราคาสินค้าใหม่เพื่อสังเกตว่า K-Means จะจัดกลุ่มสินค้าเข้าสู่ Tier ไหน
              </Text>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Product Name:</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.textSecondary }]}
                placeholder="e.g. Premium Leather Jacket"
                placeholderTextColor={theme.textSecondary}
                value={newProductName}
                onChangeText={setNewProductName}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Price (฿ THB):</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.textSecondary }]}
                placeholder="e.g. 5900"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
                value={newProductPrice}
                onChangeText={setNewProductPrice}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Stock Quantity:</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.textSecondary }]}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
                value={newProductStock}
                onChangeText={setNewProductStock}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddProduct}>
                  <Text style={styles.modalSubmitText}>Run Re-clustering</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 280,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  aiBadge: {
    backgroundColor: '#3B82F622',
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F644',
  },
  aiBadgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  algoBadge: {
    backgroundColor: '#10B98122',
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98144',
  },
  algoBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  simulateBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  simulateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    padding: Spacing.four,
    borderRadius: 16,
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  controlsCard: {
    padding: Spacing.four,
    borderRadius: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.four,
  },
  controlGroup: {
    gap: Spacing.two,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  kButtonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
  },
  kButtonActive: {
    backgroundColor: '#3B82F6',
  },
  kButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  modeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#9CA3AF22',
  },
  modeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444433',
  },
  resetBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  spectrumCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  spectrumBarContainer: {
    height: 48,
    marginVertical: Spacing.three,
    justifyContent: 'center',
    position: 'relative',
  },
  spectrumGradientLine: {
    height: 10,
    width: '100%',
    borderRadius: 5,
    backgroundColor: '#3B82F644',
  },
  spectrumDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: 15,
    marginLeft: -9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 24,
    left: -40,
    width: 100,
    backgroundColor: '#1E293B',
    padding: 4,
    borderRadius: 4,
    opacity: 0.9,
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 9,
    textAlign: 'center',
  },
  spectrumAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  clustersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  clusterCard: {
    flex: 1,
    minWidth: 260,
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
  },
  clusterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  clusterColorBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterIdText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  clusterTitleGroup: {
    flex: 1,
  },
  clusterLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  clusterCountText: {
    fontSize: 12,
    marginTop: 2,
  },
  centroidMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#00000010',
    padding: Spacing.three,
    borderRadius: 12,
  },
  metricBox: {
    gap: 2,
  },
  metricTitle: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricValueSmall: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  clusterFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  clusterFooterText: {
    fontSize: 12,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailSection: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  detailBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  productsTable: {
    gap: Spacing.two,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.three,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productSubText: {
    fontSize: 12,
  },
  priceDistCol: {
    alignItems: 'flex-end',
  },
  productPriceText: {
    fontSize: 16,
    fontWeight: '800',
  },
  distText: {
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.five,
    borderRadius: 20,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFF',
    fontWeight: '700',
  },
  scopeSwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 14,
    marginVertical: Spacing.three,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  scopeTabActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scopeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scopeBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  scopeBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  scopeBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
