export interface ProductItem {
  id: string;
  name: string;
  brand?: string;
  color?: string;
  price: number;
  stock: number;
  category: string;
  location_count?: number;
  location_text?: string;
  badge_status?: string;
  image_url: string;
}

export interface ClusterResult {
  clusterId: number;
  label: string;
  color: string;
  centroidPrice: number;
  centroidStock: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalStock: number;
  totalValue: number;
  products: (ProductItem & { distanceToCentroid: number })[];
}

export interface KMeansOutput {
  k: number;
  clusters: ClusterResult[];
  wcss: number;
  iterations: number;
  converged: boolean;
}

// Preset colors for clusters
const CLUSTER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald / Green
  '#F59E0B', // Amber / Orange
  '#EC4899', // Pink / Rose
  '#8B5CF6', // Purple / Indigo
];

// Preset labels for clusters sorted by price ascending (Low -> Mid -> High)
const CLUSTER_LABELS_MAP: Record<number, string[]> = {
  2: ['กลุ่มราคาต่ำ (Low Tier)', 'กลุ่มราคาสูง (High Tier)'],
  3: ['กลุ่มราคาต่ำ (Low Tier)', 'กลุ่มราคากลาง (Mid Tier)', 'กลุ่มราคาสูง (High Tier)'],
  4: ['กลุ่มราคาต่ำ (Low)', 'ราคากลางระดับเริ่มต้น (Lower-Mid)', 'ราคากลางระดับสูง (Upper-Mid)', 'กลุ่มราคาสูง (High/Luxury)'],
  5: ['ราคาประหยัด (Budget)', 'กลุ่มราคาต่ำ (Low)', 'กลุ่มราคากลาง (Mid)', 'กลุ่มราคาสูง (High)', 'ราคาสูงพิเศษ (Ultra Luxury)'],
};

/**
 * Runs 1D or 2D K-Means Clustering on product items based on price (and optionally stock)
 */
export function runKMeans(
  products: ProductItem[],
  k: number = 3,
  mode: '1D' | '2D' = '1D',
  maxIterations: number = 50
): KMeansOutput {
  if (!products || products.length === 0) {
    return {
      k,
      clusters: [],
      wcss: 0,
      iterations: 0,
      converged: true,
    };
  }

  // Ensure k is within bounds [1, products.length]
  const effectiveK = Math.min(Math.max(1, k), products.length);

  // Extract features (Price & Stock)
  const items = products.map((p) => ({
    product: p,
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price || '0') || 0,
    stock: typeof p.stock === 'number' ? p.stock : parseInt(p.stock || '0', 10) || 0,
  }));

  // Normalize features for distance calculation if 2D
  const minP = Math.min(...items.map((i) => i.price));
  const maxP = Math.max(...items.map((i) => i.price));
  const pRange = maxP - minP || 1;

  const minS = Math.min(...items.map((i) => i.stock));
  const maxS = Math.max(...items.map((i) => i.stock));
  const sRange = maxS - minS || 1;

  // Helper distance function
  const getDistance = (
    itemPrice: number,
    itemStock: number,
    cPrice: number,
    cStock: number
  ) => {
    if (mode === '1D') {
      return Math.abs(itemPrice - cPrice);
    }
    // 2D distance normalized
    const normP1 = (itemPrice - minP) / pRange;
    const normP2 = (cPrice - minP) / pRange;
    const normS1 = (itemStock - minS) / sRange;
    const normS2 = (cStock - minS) / sRange;
    return Math.sqrt(Math.pow(normP1 - normP2, 2) + Math.pow(normS1 - normS2, 2));
  };

  // Initialize centroids evenly spaced across the sorted price range (k-means++ style)
  const sortedPrices = [...items].sort((a, b) => a.price - b.price);
  let centroids: { price: number; stock: number }[] = [];

  for (let i = 0; i < effectiveK; i++) {
    const idx = Math.floor((i / (effectiveK === 1 ? 1 : effectiveK - 1)) * (sortedPrices.length - 1));
    centroids.push({
      price: sortedPrices[idx].price,
      stock: sortedPrices[idx].stock,
    });
  }

  let assignments = new Array(items.length).fill(0);
  let converged = false;
  let iterations = 0;

  while (!converged && iterations < maxIterations) {
    iterations++;
    let newAssignments = new Array(items.length).fill(0);

    // 1. Assign points to nearest centroid
    for (let i = 0; i < items.length; i++) {
      let minDist = Infinity;
      let closestCluster = 0;

      for (let c = 0; c < effectiveK; c++) {
        const dist = getDistance(
          items[i].price,
          items[i].stock,
          centroids[c].price,
          centroids[c].stock
        );
        if (dist < minDist) {
          minDist = dist;
          closestCluster = c;
        }
      }
      newAssignments[i] = closestCluster;
    }

    // Check if assignments changed
    const changed = newAssignments.some((val, idx) => val !== assignments[idx]);
    assignments = newAssignments;

    if (!changed && iterations > 1) {
      converged = true;
      break;
    }

    // 2. Recompute centroids
    const newCentroids = [];
    for (let c = 0; c < effectiveK; c++) {
      const clusterPoints = items.filter((_, idx) => assignments[idx] === c);
      if (clusterPoints.length === 0) {
        newCentroids.push(centroids[c]); // Keep old centroid if empty
      } else {
        const avgPrice =
          clusterPoints.reduce((sum, item) => sum + item.price, 0) / clusterPoints.length;
        const avgStock =
          clusterPoints.reduce((sum, item) => sum + item.stock, 0) / clusterPoints.length;
        newCentroids.push({ price: avgPrice, stock: avgStock });
      }
    }
    centroids = newCentroids;
  }

  // Group final results
  const rawClusters = Array.from({ length: effectiveK }, (_, c) => {
    const clusterItems = items.filter((_, idx) => assignments[idx] === c);
    const cPrice = centroids[c].price;
    const cStock = centroids[c].stock;

    const productsWithDist = clusterItems.map((ci) => ({
      ...ci.product,
      price: ci.price,
      stock: ci.stock,
      distanceToCentroid: Math.round(
        getDistance(ci.price, ci.stock, cPrice, cStock) * (mode === '1D' ? 1 : pRange)
      ),
    }));

    const prices = clusterItems.map((ci) => ci.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;
    const totalStock = clusterItems.reduce((a, b) => a + b.stock, 0);
    const totalValue = clusterItems.reduce((a, b) => a + b.price * b.stock, 0);

    return {
      rawClusterId: c,
      centroidPrice: Math.round(cPrice),
      centroidStock: Math.round(cStock),
      minPrice,
      maxPrice,
      avgPrice,
      totalStock,
      totalValue,
      products: productsWithDist,
    };
  });

  // Sort clusters by centroid price ascending so Cluster 0 is lowest price, Cluster K-1 is highest
  rawClusters.sort((a, b) => a.centroidPrice - b.centroidPrice);

  const labels = CLUSTER_LABELS_MAP[effectiveK] || Array.from({ length: effectiveK }, (_, i) => `Cluster ${i + 1}`);

  const clusters: ClusterResult[] = rawClusters.map((rc, idx) => ({
    clusterId: idx + 1,
    label: labels[idx] || `Cluster Tier ${idx + 1}`,
    color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
    centroidPrice: rc.centroidPrice,
    centroidStock: rc.centroidStock,
    minPrice: rc.minPrice,
    maxPrice: rc.maxPrice,
    avgPrice: rc.avgPrice,
    totalStock: rc.totalStock,
    totalValue: rc.totalValue,
    products: rc.products.sort((a, b) => a.price - b.price),
  }));

  // Calculate WCSS (Within-Cluster Sum of Squares / Inertia)
  let wcss = 0;
  clusters.forEach((cluster) => {
    cluster.products.forEach((p) => {
      wcss += Math.pow(p.price - cluster.centroidPrice, 2);
    });
  });

  return {
    k: effectiveK,
    clusters,
    wcss: Math.round(wcss),
    iterations,
    converged,
  };
}
