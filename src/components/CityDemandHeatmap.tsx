import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Flame,
  Activity,
  Layers,
  Clock,
  Sparkles,
  MapPin,
  TrendingUp,
  Truck,
  Thermometer,
  ShieldAlert,
  Play,
  Pause,
  Info,
} from 'lucide-react';
import {
  getCityZoneDensityData,
  getHourlyZoneDensityMatrix,
  calculateCityDensitySummary,
  type CityDeliveryZoneDensity,
  type HourlyZoneDensityCell,
  type HeatmapTimeWindow,
  type HeatmapMetricType,
} from '../utils/deliveryLogic';

interface CityDemandHeatmapProps {
  onTriggerPushAlert?: (title: string, body: string) => void;
}

export const CityDemandHeatmap: React.FC<CityDemandHeatmapProps> = ({
  onTriggerPushAlert,
}) => {
  const [viewMode, setViewMode] = useState<'spatial' | 'matrix'>('spatial');
  const [timeWindow, setTimeWindow] = useState<HeatmapTimeWindow>('live');
  const [selectedMetric, setSelectedMetric] = useState<HeatmapMetricType>('density');
  const [isSimulatingLiveFlux, setIsSimulatingLiveFlux] = useState<boolean>(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Live flux jitter state for realistic simulated real-time updates
  const [fluxJitter, setFluxJitter] = useState<number>(0);

  // SVG ref for D3 rendering
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute live data
  const baseZones = getCityZoneDensityData(timeWindow, selectedMetric);
  const liveZones: CityDeliveryZoneDensity[] = baseZones.map((z, idx) => {
    if (!isSimulatingLiveFlux) return z;
    // Small pseudo-random organic fluctuation based on fluxJitter and index
    const shift = Math.sin(fluxJitter * 0.8 + idx * 1.3) * 6;
    const ordersPerKm2 = Math.max(12, Math.round(z.ordersPerKm2 + shift));
    const activeOrders = Math.max(10, Math.round(z.activeOrders + shift * 1.2));
    let densityTier: CityDeliveryZoneDensity['densityTier'] = 'LOW';
    if (ordersPerKm2 >= 90) densityTier = 'CRITICAL_SURGE';
    else if (ordersPerKm2 >= 70) densityTier = 'HIGH';
    else if (ordersPerKm2 >= 45) densityTier = 'MODERATE';

    return {
      ...z,
      ordersPerKm2,
      activeOrders,
      densityTier,
    };
  });

  const summary = calculateCityDensitySummary(liveZones);
  const hourlyMatrix = getHourlyZoneDensityMatrix();

  // Active selected zone details
  const activeZone = liveZones.find((z) => z.id === selectedZoneId) || liveZones[0];

  // Periodic simulation timer
  useEffect(() => {
    if (!isSimulatingLiveFlux) return;
    const interval = window.setInterval(() => {
      setFluxJitter((prev) => prev + 1);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [isSimulatingLiveFlux]);

  // Main D3 Rendering Effect
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 860;
    const height = 520;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Tooltip selection
    const tooltip = d3
      .select('#d3-heatmap-tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Color Scales
    // Low: #10B981 (emerald), Mid: #F59E0B (amber), High: #EF4444 (red-orange), Surge: #EC4899 (magenta-rose)
    const colorScale = d3
      .scaleLinear<string>()
      .domain([20, 50, 75, 105])
      .range(['#10B981', '#F59E0B', '#EF4444', '#EC4899'])
      .clamp(true);

    if (viewMode === 'spatial') {
      // ==========================================
      // SPATIAL CONTOUR & HOTSPOT CLUSTER HEATMAP
      // ==========================================
      const margin = { top: 35, right: 35, bottom: 45, left: 45 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // 1. Grid Background & Coordinate Axes
      const xScale = d3
        .scaleLinear()
        .domain([79.82, 79.94]) // Longitude span across Colombo & Western Province
        .range([0, innerWidth]);

      const yScale = d3
        .scaleLinear()
        .domain([6.83, 6.96]) // Latitude span across Colombo & Western Province
        .range([innerHeight, 0]);

      // Subtle background radar rings centered on Flagship Kitchen (Cinnamon Gardens, Colombo 07: 79.8653, 6.9147)
      const kitchenX = xScale(79.8653);
      const kitchenY = yScale(6.9147);

      const defs = svg.append('defs');

      // Radial gradient for hotspot glow
      const glowGrad = defs
        .append('radialGradient')
        .attr('id', 'hotspot-glow')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      glowGrad.append('stop').attr('offset', '0%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.6);
      glowGrad.append('stop').attr('offset', '50%').attr('stop-color', '#EF4444').attr('stop-opacity', 0.25);
      glowGrad.append('stop').attr('offset', '100%').attr('stop-color', '#EF4444').attr('stop-opacity', 0);

      // Radar range circles
      [40, 90, 150, 220, 300].forEach((r, idx) => {
        g.append('circle')
          .attr('cx', kitchenX)
          .attr('cy', kitchenY)
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', '#334155')
          .attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '3 4')
          .attr('opacity', 0.4);

        // Distance annotation
        g.append('text')
          .attr('x', kitchenX + r + 3)
          .attr('y', kitchenY - 2)
          .attr('fill', '#64748B')
          .attr('font-size', '9px')
          .attr('font-family', 'ui-monospace, monospace')
          .text(`${(idx + 1) * 3}km`);
      });

      // 2. Generate D3 Contour Density
      // Synthesize dense sample points based on liveZones order density and locations
      const samplePoints: [number, number][] = [];
      liveZones.forEach((z) => {
        const cx = xScale(z.lng);
        const cy = yScale(z.lat);
        const count = Math.round(z.ordersPerKm2 * 1.6);
        const spread = Math.max(18, 38 - z.ordersPerKm2 * 0.15);

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * spread;
          samplePoints.push([
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius,
          ]);
        }
      });

      const densityData = d3
        .contourDensity()
        .size([innerWidth, innerHeight])
        .bandwidth(32)
        .thresholds(18)(samplePoints);

      const maxVal = d3.max(densityData, (d) => d.value) || 0.005;

      const contourColor = d3
        .scaleSequential(d3.interpolateWarm)
        .domain([0, maxVal * 0.95]);

      // Draw contour polygons
      const geoPath = d3.geoPath();
      g.append('g')
        .attr('class', 'density-contours')
        .selectAll('path')
        .data(densityData)
        .enter()
        .append('path')
        .attr('d', geoPath)
        .attr('fill', (d) => contourColor(d.value))
        .attr('opacity', (d) => Math.min(0.75, (d.value / maxVal) * 0.85 + 0.12))
        .attr('stroke', (d) => contourColor(d.value))
        .attr('stroke-width', 0.6)
        .attr('stroke-opacity', 0.5);

      // 3. Draw Zone Thermal Diffusion Blobs
      liveZones.forEach((z) => {
        const cx = xScale(z.lng);
        const cy = yScale(z.lat);
        const radius = Math.max(24, (z.ordersPerKm2 / 100) * 58);

        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius)
          .attr('fill', 'url(#hotspot-glow)')
          .attr('opacity', z.ordersPerKm2 >= 70 ? 0.85 : 0.45);
      });

      // 4. City Zone Hotspot Pins & Interaction Nodes
      const nodesGroup = g.append('g').attr('class', 'zone-nodes');

      const nodes = nodesGroup
        .selectAll('g.zone-node')
        .data(liveZones)
        .enter()
        .append('g')
        .attr('class', 'zone-node cursor-pointer')
        .attr('transform', (d) => `translate(${xScale(d.lng)},${yScale(d.lat)})`)
        .on('click', (_, d) => {
          setSelectedZoneId(d.id);
          if (onTriggerPushAlert) {
            onTriggerPushAlert(
              `Sector Focus · ${d.name}`,
              `Density ${d.ordersPerKm2} orders/km² · ${d.activeOrders} active orders · Fleet: ${d.activeCouriers} couriers.`
            );
          }
        })
        .on('mouseover', (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGGElement).select('.pulse-circle').attr('stroke-width', 3);

          tooltip
            .style('opacity', 1)
            .html(`
              <div class="space-y-1.5 p-1 text-xs">
                <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                  <span class="font-bold text-white text-sm">${d.name}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    d.densityTier === 'CRITICAL_SURGE'
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                      : d.densityTier === 'HIGH'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  }">${d.densityTier.replace('_', ' ')}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-1">
                  <div>Delivery Density: <strong class="text-amber-400 font-bold">${d.ordersPerKm2}</strong> /km²</div>
                  <div>Active Orders: <strong class="text-white">${d.activeOrders}</strong></div>
                  <div>Fleet Allocated: <strong class="text-emerald-400">${d.activeCouriers}</strong> units</div>
                  <div>Avg Transit Time: <strong class="text-sky-400">${d.avgDeliveryMins} mins</strong></div>
                  <div>Surge Multiplier: <strong class="text-amber-400">${d.surgeMultiplier}x</strong></div>
                  <div>Thermal Hold: <strong class="text-emerald-400">${d.thermalCompliancePct}%</strong></div>
                </div>
                <div class="text-[11px] text-slate-400 pt-1 border-t border-white/10">
                  Top Trending: <span class="text-white font-medium">${d.topDish}</span>
                </div>
              </div>
            `);
        })
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, document.body);
          tooltip
            .style('left', `${mx + 16}px`)
            .style('top', `${my - 28}px`);
        })
        .on('mouseout', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGGElement).select('.pulse-circle').attr('stroke-width', 1.5);
          tooltip.style('opacity', 0);
        });

      // Animated surge pulse ring for high surge zones
      nodes
        .filter((d) => d.densityTier === 'CRITICAL_SURGE' || d.densityTier === 'HIGH')
        .append('circle')
        .attr('r', 16)
        .attr('fill', 'none')
        .attr('stroke', (d) => colorScale(d.ordersPerKm2))
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', '12;28;34')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      nodes
        .filter((d) => d.densityTier === 'CRITICAL_SURGE' || d.densityTier === 'HIGH')
        .append('circle')
        .attr('r', 16)
        .attr('fill', 'none')
        .attr('stroke', (d) => colorScale(d.ordersPerKm2))
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '0.8;0.3;0')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');

      // Pin core circle
      nodes
        .append('circle')
        .attr('class', 'pulse-circle')
        .attr('r', (d) => Math.max(9, Math.min(16, d.ordersPerKm2 * 0.14)))
        .attr('fill', (d) => colorScale(d.ordersPerKm2))
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', (d) => (d.id === selectedZoneId ? 2.5 : 1.2))
        .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.6))');

      // Pin numerical density text inside circle
      nodes
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#0B0F17')
        .attr('font-size', '9.5px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text((d) => d.ordersPerKm2);

      // Label background pill for readability
      nodes
        .append('rect')
        .attr('x', -34)
        .attr('y', 15)
        .attr('width', 68)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', '#0B0F17')
        .attr('fill-opacity', 0.85)
        .attr('stroke', '#334155')
        .attr('stroke-width', 0.75);

      // Label text
      nodes
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 26.5)
        .attr('fill', '#E2E8F0')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
        .text((d) => d.shortLabel);

      // 5. Compass Rose / North Indicator
      const compass = g
        .append('g')
        .attr('transform', `translate(${innerWidth - 30}, 25)`);
      compass
        .append('circle')
        .attr('r', 14)
        .attr('fill', '#0B0F17')
        .attr('stroke', '#475569')
        .attr('stroke-width', 1);
      compass
        .append('path')
        .attr('d', 'M 0 -10 L 4 2 L 0 -1 L -4 2 Z')
        .attr('fill', '#F59E0B');
      compass
        .append('path')
        .attr('d', 'M 0 10 L 4 -2 L 0 1 L -4 -2 Z')
        .attr('fill', '#64748B');
      compass
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -13)
        .attr('fill', '#F59E0B')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .text('N');
    } else {
      // ==========================================
      // TEMPORAL HOURLY DENSITY MATRIX HEATMAP
      // ==========================================
      const margin = { top: 35, right: 35, bottom: 50, left: 110 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const zonesList = Array.from(new Set(hourlyMatrix.map((d) => d.zoneName)));
      const hoursList = Array.from(new Set(hourlyMatrix.map((d) => d.hourLabel)));

      const xBand = d3
        .scaleBand()
        .domain(hoursList)
        .range([0, innerWidth])
        .padding(0.08);

      const yBand = d3
        .scaleBand()
        .domain(zonesList)
        .range([0, innerHeight])
        .padding(0.12);

      const matrixColor = d3
        .scaleSequential(d3.interpolateWarm)
        .domain([20, 105]);

      // X Axis (Hours)
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xBand).tickSize(0))
        .call((axis) => axis.select('.domain').remove())
        .selectAll('text')
        .attr('fill', '#94A3B8')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('dy', '1em');

      // Y Axis (Zones)
      g.append('g')
        .call(d3.axisLeft(yBand).tickSize(0))
        .call((axis) => axis.select('.domain').remove())
        .selectAll('text')
        .attr('fill', '#E2E8F0')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('dx', '-0.5em');

      // Heatmap Grid Cells
      g.selectAll('rect.matrix-cell')
        .data(hourlyMatrix)
        .enter()
        .append('rect')
        .attr('class', 'matrix-cell cursor-pointer transition-all duration-200')
        .attr('x', (d) => xBand(d.hourLabel) || 0)
        .attr('y', (d) => yBand(d.zoneName) || 0)
        .attr('width', xBand.bandwidth())
        .attr('height', yBand.bandwidth())
        .attr('rx', 4)
        .attr('fill', (d) => matrixColor(d.densityValue))
        .attr('stroke', '#0B0F17')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.9)
        .on('mouseover', (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGRectElement).attr('stroke', '#FFFFFF').attr('stroke-width', 2);
          tooltip
            .style('opacity', 1)
            .html(`
              <div class="space-y-1 p-1 text-xs">
                <div class="font-bold text-white text-sm border-b border-white/10 pb-1">
                  ${d.zoneName} · ${d.hourLabel}
                </div>
                <div class="text-slate-300 font-mono text-[11px] pt-0.5">
                  Demand Density: <strong class="text-amber-400 font-bold">${d.densityValue}</strong> orders/km²
                </div>
                <div class="text-slate-300 font-mono text-[11px]">
                  Projected Volume: <strong class="text-white">${d.orderVolume}</strong> deliveries
                </div>
                <div class="text-slate-300 font-mono text-[11px]">
                  Surge Index: <strong class="text-emerald-400">${d.surgeMultiplier}x</strong>
                </div>
              </div>
            `);
        })
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, document.body);
          tooltip
            .style('left', `${mx + 16}px`)
            .style('top', `${my - 28}px`);
        })
        .on('mouseout', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGRectElement).attr('stroke', '#0B0F17').attr('stroke-width', 1.5);
          tooltip.style('opacity', 0);
        });

      // Cell numerical labels for high volume cells
      g.selectAll('text.cell-label')
        .data(hourlyMatrix)
        .enter()
        .filter((d) => d.densityValue >= 50)
        .append('text')
        .attr('class', 'cell-label pointer-events-none')
        .attr('x', (d) => (xBand(d.hourLabel) || 0) + xBand.bandwidth() / 2)
        .attr('y', (d) => (yBand(d.zoneName) || 0) + yBand.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#0B0F17')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text((d) => d.densityValue);
    }
  }, [viewMode, timeWindow, selectedMetric, fluxJitter, selectedZoneId]);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & CONTROL TOOLBAR */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              D3.js Spatial Analytics
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DENSITY ENGINE ACTIVE</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>Citywide Delivery Density & Demand Heatmap</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            D3-powered spatial contour density and temporal cross-tabulation of live courier dispatch patterns across Colombo metropolitan corridors.
          </p>
        </div>

        {/* View Mode & Time Window Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('spatial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'spatial'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Spatial Contours</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Hourly Matrix</span>
            </button>
          </div>

          {/* Time Window Filter */}
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as HeatmapTimeWindow)}
            aria-label="Select delivery density time window"
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="live">Live Peak (Current)</option>
            <option value="lunch">Corporate Lunch (12:00 - 14:00)</option>
            <option value="afternoon">Afternoon Lull (15:00 - 17:00)</option>
            <option value="dinner">Dinner Surge (19:00 - 22:00)</option>
            <option value="latenight">Late Night Cravings (22:00 - 01:00)</option>
          </select>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as HeatmapMetricType)}
            aria-label="Select heatmap density metric"
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="density">Orders / km² (Density)</option>
            <option value="orders">Active Order Volume</option>
            <option value="couriers">Allocated Couriers</option>
            <option value="thermal_risk">Thermal Transit Risk</option>
          </select>

          {/* Live Simulation Flux Toggle */}
          <button
            type="button"
            onClick={() => setIsSimulatingLiveFlux((prev) => !prev)}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isSimulatingLiveFlux
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
            title="Toggle simulated real-time demand flux updates"
          >
            {isSimulatingLiveFlux ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Flux Simulation: Live</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Flux Simulation: Paused</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRIC STRIP (4 KPI Cards with Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
            Peak Density Corridor
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-500 truncate">
            {summary.peakZoneName}
          </div>
          <div className="text-[11px] font-mono text-emerald-500">
            {summary.peakDensity} orders/km² (High Surge)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
            Active In-Flight Deliveries
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {summary.totalActiveDeliveries} Meals
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Across 10 metropolitan micro-zones
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
            Fleet Deployment Saturation
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {summary.totalActiveCouriers} Units Live
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Avg Courier Transit: {summary.cityAvgWaitMins} mins
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
            Surge Status
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-rose-400">
            {summary.highSurgeZoneCount} Critical Sectors
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Induction thermal pods active
          </div>
        </div>
      </div>

      {/* D3 VISUALIZATION CANVAS & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main D3 Heatmap SVG Canvas (8 Cols) */}
        <div
          ref={containerRef}
          className="lg:col-span-8 bg-[#0B0F17] border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-2xl flex flex-col justify-between"
        >
          {/* Header overlay badge */}
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {viewMode === 'spatial'
                  ? 'COLOMBO SPATIAL CONTOUR DENSITY'
                  : 'HOURLY TIME-SLICE DEMAND MATRIX'}
              </span>
            </span>
            <span className="text-[11px] text-slate-500">
              {viewMode === 'spatial' ? 'Origin: FUDORA Flagship Kitchen (Cinnamon Gardens, Colombo 07)' : '11:00 AM – 11:00 PM SLST'}
            </span>
          </div>

          {/* D3 SVG Element */}
          <div className="relative w-full aspect-[860/520] bg-gradient-to-b from-[#080B12] via-[#0B0F17] to-[#0A0D15] rounded-xl overflow-hidden border border-slate-800/80">
            <svg
              ref={svgRef}
              data-testid="d3-city-demand-heatmap-svg"
              className="w-full h-full select-none"
            />
          </div>

          {/* D3 Continuous Color Scale Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Density Scale:</span>
              <div className="w-48 sm:w-64 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 via-red-500 to-pink-500 shadow-inner" />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Low (&lt;45)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Moderate (45-70)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>High (70-90)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span>Surge (&gt;90/km²)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Selected Sector Telemetry & Hotspot Insights Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">
                  Sector Telemetry Detail
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeZone.name}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeZone.densityTier === 'CRITICAL_SURGE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : activeZone.densityTier === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {activeZone.densityTier.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">ORDERS / KM²</div>
                <div className="text-lg font-bold text-amber-500">
                  {activeZone.ordersPerKm2}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">ACTIVE IN-FLIGHT</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeZone.activeOrders}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">FLEET ALLOCATED</div>
                <div className="text-lg font-bold text-emerald-400">
                  {activeZone.activeCouriers} units
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">AVG TRANSIT WAIT</div>
                <div className="text-lg font-bold text-sky-400">
                  {activeZone.avgDeliveryMins} mins
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Thermal Integrity Score:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {activeZone.thermalCompliancePct}% Compliance
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Dynamic Surge Multiplier:</span>
                <span className="font-mono font-bold text-amber-400">
                  {activeZone.surgeMultiplier}x
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Top Trending 3D Dish:</span>
                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[170px]">
                  {activeZone.topDish}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onTriggerPushAlert) {
                  onTriggerPushAlert(
                    `Fleet Rebalanced to ${activeZone.shortLabel}`,
                    `Dispatched +2 reserve electric couriers to absorb ${activeZone.ordersPerKm2} orders/km² surge.`
                  );
                }
              }}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Truck className="w-4 h-4" />
              <span>Deploy +2 Couriers to {activeZone.shortLabel}</span>
            </button>
          </div>

          {/* Sector Hotspot List */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Top City Delivery Hotspots</span>
              <span className="text-[10px] font-mono text-slate-400">10 Zones</span>
            </div>
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {liveZones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    z.id === selectedZoneId
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{z.name}</span>
                  <span className="font-mono font-bold text-amber-400 text-[11px] shrink-0 ml-2">
                    {z.ordersPerKm2}/km²
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating D3 Tooltip Element (Rendered in DOM) */}
      <div
        id="d3-heatmap-tooltip"
        className="fixed z-50 pointer-events-none rounded-xl bg-slate-950/95 border border-amber-500/40 p-3 shadow-2xl backdrop-blur-md max-w-xs transition-opacity duration-150"
      />
    </div>
  );
};
