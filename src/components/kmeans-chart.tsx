import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { ClusterResult, KMeansOutput } from '@/utils/kmeans';

interface KMeansChartProps {
  kMeansResult: KMeansOutput;
  overallMinPrice: number;
  overallMaxPrice: number;
  mode: '1D' | '2D';
  theme: any;
  onSelectCluster?: (clusterId: number | null) => void;
}

export function KMeansChart({
  kMeansResult,
  overallMinPrice,
  overallMaxPrice,
  mode,
  theme,
  onSelectCluster,
}: KMeansChartProps) {
  const [chartType, setChartType] = useState<'scatter' | 'bar'>('scatter');
  const [useLogScale, setUseLogScale] = useState<boolean>(true);
  const [hoveredProduct, setHoveredProduct] = useState<any | null>(null);

  // All products flattened with their cluster info
  const allProducts = useMemo(() => {
    const list: any[] = [];
    kMeansResult.clusters.forEach((cluster) => {
      cluster.products.forEach((prod) => {
        list.push({
          ...prod,
          clusterId: cluster.clusterId,
          clusterLabel: cluster.label,
          clusterColor: cluster.color,
          centroidPrice: cluster.centroidPrice,
        });
      });
    });
    return list;
  }, [kMeansResult]);

  // Stocks range for Y-axis
  const stocks = allProducts.map((p) => p.stock);
  const minStock = Math.min(...(stocks.length ? stocks : [0]));
  const maxStock = Math.max(...(stocks.length ? stocks : [50])) || 50;

  // Price scaling function (Linear or Logarithmic for better spacing with 19% horizontal margin)
  const getXPercent = (price: number) => {
    if (overallMaxPrice === overallMinPrice) return 50;
    if (useLogScale && overallMinPrice > 0) {
      const minLog = Math.log(overallMinPrice);
      const maxLog = Math.log(overallMaxPrice);
      const pLog = Math.log(Math.max(price, overallMinPrice));
      return ((pLog - minLog) / (maxLog - minLog || 1)) * 62 + 19;
    }
    return ((price - overallMinPrice) / (overallMaxPrice - overallMinPrice || 1)) * 62 + 19;
  };

  const getYPercent = (stock: number, idx: number, total: number) => {
    if (mode === '2D') {
      if (maxStock === minStock) return 50;
      return ((stock - minStock) / (maxStock - minStock || 1)) * 46 + 27;
    }
    // In 1D mode, spread Y vertically by index with 27% top/bottom padding
    return (idx / (total > 1 ? total - 1 : 1)) * 46 + 27;
  };

  // Find max centroid price for Bar Chart scaling
  const maxCentroidPrice = Math.max(
    ...kMeansResult.clusters.map((c) => c.centroidPrice),
    1
  );

  return (
    <View style={[styles.cardContainer, { backgroundColor: theme.backgroundElement }]}>
      {/* Header & Controls */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            K-Means Visual Analytics Chart
          </Text>
          <Text style={[styles.chartSub, { color: theme.textSecondary }]}>
            {chartType === 'scatter'
              ? `Scatter Plot (${mode === '1D' ? 'Price Distribution & Centroids' : 'Price vs Stock Space'})`
              : 'Cluster Comparison Bar Chart'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {/* Chart Type Toggle */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                chartType === 'scatter' && styles.segmentBtnActive,
              ]}
              onPress={() => setChartType('scatter')}>
              <Text
                style={[
                  styles.segmentText,
                  chartType === 'scatter' && styles.segmentTextActive,
                ]}>
                Scatter Plot
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                chartType === 'bar' && styles.segmentBtnActive,
              ]}
              onPress={() => setChartType('bar')}>
              <Text
                style={[
                  styles.segmentText,
                  chartType === 'bar' && styles.segmentTextActive,
                ]}>
                Bar Chart
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scale Toggle for Scatter Plot */}
          {chartType === 'scatter' && (
            <TouchableOpacity
              style={[
                styles.scaleBtn,
                useLogScale && styles.scaleBtnActive,
              ]}
              onPress={() => setUseLogScale(!useLogScale)}>
              <Text style={[styles.scaleBtnText, useLogScale && styles.scaleTextActive]}>
                {useLogScale ? 'Log Scale (Spread Out)' : 'Linear Scale'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SCATTER PLOT VIEW */}
      {chartType === 'scatter' ? (
        <View style={styles.chartCanvasArea}>
          {/* Background Grid Lines */}
          <View style={styles.gridOverlay}>
            <View style={[styles.gridLine, { top: '25%' }]} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { top: '75%' }]} />
            <View style={[styles.gridLineVert, { left: '25%' }]} />
            <View style={[styles.gridLineVert, { left: '50%' }]} />
            <View style={[styles.gridLineVert, { left: '75%' }]} />
          </View>

          {/* Y Axis Label */}
          <View style={styles.yAxisLabelBox}>
            <Text style={[styles.yAxisTitle, { color: theme.textSecondary }]}>
              {mode === '2D' ? 'Stock Quantity (Units)' : 'Distributed Spread'}
            </Text>
          </View>

          {/* Individual Product Data Points (Rendered first so Centroids stay on top) */}
          {allProducts.map((p, idx) => {
            const px = getXPercent(p.price);
            const py = getYPercent(p.stock, idx, allProducts.length);
            const isHovered = hoveredProduct?.id === p.id;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                style={[
                  styles.dataPoint,
                  {
                    left: `${px}%`,
                    bottom: `${py}%`,
                    backgroundColor: p.clusterColor,
                    transform: [{ scale: isHovered ? 1.5 : 1 }],
                    zIndex: isHovered ? 200 : 10,
                  },
                ]}
                onPress={() => {
                  setHoveredProduct(isHovered ? null : p);
                  if (onSelectCluster) onSelectCluster(p.clusterId);
                }}>
                {isHovered && (
                  <View style={styles.tooltipCard}>
                    <Image source={{ uri: p.image_url }} style={styles.tooltipImg} />
                    <View style={styles.tooltipContent}>
                      <Text style={styles.tooltipTitle}>{p.name}</Text>
                      <Text style={styles.tooltipCategory}>
                        {p.category} | {p.brand}
                      </Text>
                      <Text style={[styles.tooltipPrice, { color: p.clusterColor }]}>
                        ฿{p.price.toLocaleString()} (Group C{p.clusterId})
                      </Text>
                      <Text style={styles.tooltipStock}>
                        Stock: {p.stock} units
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Cluster Centroid Marker Indicators (Rendered on top with zIndex 500 & Clamped Position) */}
          {kMeansResult.clusters.map((cluster) => {
            const cx = getXPercent(cluster.centroidPrice);
            const cy = getYPercent(cluster.centroidStock, cluster.clusterId, kMeansResult.k);
            const isTopHalf = cy > 50;
            const isFarRight = cx > 62;
            const isFarLeft = cx < 35;

            // Compute smart boundary-aware horizontal badge alignment
            let badgeHorizontalStyle: any = { left: -50 };
            if (isFarRight) {
              badgeHorizontalStyle = { right: 0, left: 'auto' };
            } else if (isFarLeft) {
              badgeHorizontalStyle = { left: 0, right: 'auto' };
            }

            return (
              <TouchableOpacity
                key={`centroid-${cluster.clusterId}`}
                activeOpacity={0.85}
                style={[
                  styles.centroidMarker,
                  {
                    left: `${cx}%`,
                    bottom: `${cy}%`,
                    borderColor: cluster.color,
                    zIndex: 500,
                  },
                ]}
                onPress={() => onSelectCluster && onSelectCluster(cluster.clusterId)}>
                <View
                  style={[styles.centroidInnerDot, { backgroundColor: cluster.color }]}
                />
                
                {/* Stem Line Indicator */}
                <View
                  style={[
                    styles.centroidStem,
                    {
                      backgroundColor: cluster.color,
                      ...(isTopHalf ? { top: 28 } : { bottom: 28 }),
                    },
                  ]}
                />

                {/* Badge Label Box always opaque, clamped inside graph boundaries */}
                <View
                  style={[
                    styles.centroidBadgeContainer,
                    {
                      borderColor: cluster.color,
                      ...(isTopHalf ? { top: 34 } : { bottom: 34 }),
                      ...badgeHorizontalStyle,
                    },
                  ]}>
                  <Text style={[styles.centroidBadgeText, { color: cluster.color }]}>
                    ★ C{cluster.clusterId} (฿{cluster.centroidPrice.toLocaleString()})
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* X Axis Price Labels */}
          <View style={styles.xAxisRow}>
            <Text style={[styles.xAxisText, { color: theme.textSecondary }]}>
              Min: ฿{overallMinPrice.toLocaleString()}
            </Text>
            <Text style={[styles.xAxisTitle, { color: theme.text }]}>
              Product Price (฿ THB)
            </Text>
            <Text style={[styles.xAxisText, { color: theme.textSecondary }]}>
              Max: ฿{overallMaxPrice.toLocaleString()}
            </Text>
          </View>
        </View>
      ) : (
        /* BAR CHART VIEW */
        <View style={styles.barChartContainer}>
          <View style={styles.barGridArea}>
            {kMeansResult.clusters.map((cluster) => {
              const heightPercent = Math.max(
                15,
                (cluster.centroidPrice / maxCentroidPrice) * 80
              );

              return (
                <TouchableOpacity
                  key={`bar-${cluster.clusterId}`}
                  activeOpacity={0.85}
                  style={styles.barCol}
                  onPress={() => {
                    if (onSelectCluster) onSelectCluster(cluster.clusterId);
                  }}>
                  <Text style={[styles.barTopVal, { color: cluster.color }]}>
                    ฿{cluster.centroidPrice.toLocaleString()}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: cluster.color,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.barLabelGroup}>
                    <View
                      style={[styles.barColorDot, { backgroundColor: cluster.color }]}
                    />
                    <Text style={[styles.barClusterName, { color: theme.text }]}>
                      C{cluster.clusterId}
                    </Text>
                    <Text
                      style={[styles.barClusterSub, { color: theme.textSecondary }]}
                      numberOfLines={1}>
                      {cluster.label}
                    </Text>
                    <Text style={[styles.barCountBadge, { color: theme.textSecondary }]}>
                      {cluster.products.length} items
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Legend Footer */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendTitle, { color: theme.textSecondary }]}>Clusters Legend:</Text>
        <View style={styles.legendItemsGroup}>
          {kMeansResult.clusters.map((c) => (
            <TouchableOpacity
              key={`legend-${c.clusterId}`}
              style={styles.legendItem}
              onPress={() => onSelectCluster && onSelectCluster(c.clusterId)}>
              <View style={[styles.legendDot, { backgroundColor: c.color }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>
                Group C{c.clusterId}: {c.label} (฿{c.centroidPrice.toLocaleString()})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleGroup: {
    flex: 1,
    minWidth: 240,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  chartSub: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#00000025',
    padding: 3,
    borderRadius: 10,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#3B82F6',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scaleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B98118',
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  scaleBtnActive: {
    backgroundColor: '#10B981',
  },
  scaleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  scaleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartCanvasArea: {
    height: 420,
    width: '100%',
    position: 'relative',
    backgroundColor: '#00000025',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF10',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF10',
  },
  gridLineVert: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#FFFFFF10',
  },
  yAxisLabelBox: {
    position: 'absolute',
    top: 14,
    left: 16,
  },
  yAxisTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  centroidMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -16,
    marginBottom: -16,
    backgroundColor: '#090E17',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 10,
  },
  centroidInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  centroidStem: {
    position: 'absolute',
    width: 2,
    height: 12,
    left: 15,
    opacity: 0.8,
  },
  centroidBadgeContainer: {
    position: 'absolute',
    backgroundColor: '#090E17',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  centroidBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dataPoint: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    marginLeft: -11,
    marginBottom: -11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipCard: {
    position: 'absolute',
    bottom: 30,
    left: -90,
    width: 210,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF855',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltipImg: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  tooltipContent: {
    flex: 1,
    gap: 2,
  },
  tooltipTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipCategory: {
    color: '#94A3B8',
    fontSize: 10,
  },
  tooltipPrice: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  tooltipStock: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 12,
    fontWeight: '600',
  },
  xAxisTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  barChartContainer: {
    height: 420,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  barGridArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 8,
  },
  barTopVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    width: 42,
    height: 280,
    backgroundColor: '#00000025',
    borderRadius: 21,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 21,
  },
  barLabelGroup: {
    alignItems: 'center',
    gap: 2,
  },
  barColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barClusterName: {
    fontSize: 14,
    fontWeight: '800',
  },
  barClusterSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  barCountBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF10',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendItemsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00000030',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF18',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
