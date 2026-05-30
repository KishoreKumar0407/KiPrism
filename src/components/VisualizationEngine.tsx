import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { ColumnProfile, StatisticalSummary } from "../types";
import { AlertCircle, HelpCircle, Lightbulb, Play, Layers } from "lucide-react";

interface VisualizationEngineProps {
  rows: any[];
  profiles: ColumnProfile[];
  stats: { [colName: string]: StatisticalSummary };
}

// Pearson correlation logic
function getPearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

export default function VisualizationEngine({ rows, profiles, stats }: VisualizationEngineProps) {
  const numericalCols = useMemo(() => profiles.filter(p => p.role === "numerical"), [profiles]);
  const categoricalCols = useMemo(() => profiles.filter(p => p.role === "categorical"), [profiles]);
  const dateCols = useMemo(() => profiles.filter(p => p.role === "date"), [profiles]);

  // Selected dimensions
  const [colX, setColX] = useState<string>(profiles[0]?.name || "");
  const [colY, setColY] = useState<string>(profiles[1]?.name || "");
  const [chartType, setChartType] = useState<string>("");

  // Pearson Correlation Matrix calculation
  const correlationMatrix = useMemo(() => {
    if (numericalCols.length < 2) return null;
    const matrix: { [colA: string]: { [colB: string]: number } } = {};

    for (const ca of numericalCols) {
      matrix[ca.name] = {};
      for (const cb of numericalCols) {
        if (ca.name === cb.name) {
          matrix[ca.name][cb.name] = 1;
          continue;
        }

        const xVals: number[] = [];
        const yVals: number[] = [];

        rows.forEach(r => {
          const rawX = r[ca.name];
          const rawY = r[cb.name];
          if (rawX !== null && rawX !== undefined && rawY !== null && rawY !== undefined) {
            const xNum = Number(String(rawX).replace(/[\$,%]/g, ""));
            const yNum = Number(String(rawY).replace(/[\$,%]/g, ""));
            if (!isNaN(xNum) && !isNaN(yNum)) {
              xVals.push(xNum);
              yVals.push(yNum);
            }
          }
        });

        matrix[ca.name][cb.name] = getPearsonCorrelation(xVals, yVals);
      }
    }
    return matrix;
  }, [rows, numericalCols]);

  // Smart Chart Recommendation Engine
  const recommendation = useMemo(() => {
    if (!colX) return null;

    const profX = profiles.find(p => p.name === colX);
    const profY = profiles.find(p => p.name === colY);

    if (!profX) return null;

    // Case 1: Single X Selection
    if (!colY || colX === colY) {
      if (profX.role === "numerical") {
        return {
          type: "Histogram / Density Plot",
          reason: `"${colX}" is numerical. A Histogram or Density Plot is the ideal way to visualize distribution, skewness, and frequency density of single numerical variables.`,
          suitableTypes: ["histogram", "boxplot"],
        };
      } else {
        return {
          type: "Bar Chart / Pie Chart",
          reason: `"${colX}" is categorical. A Bar Chart or Pie Chart demonstrates categorical spreads, proportions, and value frequency spreads clearly.`,
          suitableTypes: ["bar_freq", "pie"],
        };
      }
    }

    if (!profY) return null;

    // Case 2: Multi-Variable selection
    // Numerical vs Numerical
    if (profX.role === "numerical" && profY.role === "numerical") {
      return {
        type: "Scatter Plot with Multi-variable trend",
        reason: `Both "${colX}" and "${colY}" are numerical metrics. A Scatter Plot is the statistical gold standard to analyze linear correlations and pairwise patterns.`,
        suitableTypes: ["scatter", "correlation_grid"],
      };
    }

    // Time-series (Date X and Numerical Y)
    if ((profX.role === "date" && profY.role === "numerical") || (profY.role === "date" && profX.role === "numerical")) {
      return {
        type: "Time Series Line Chart",
        reason: `Detected date-time and continuous numeric sequence. A Line Chart tracking timelines clearly evaluates progression trends.`,
        suitableTypes: ["line"],
      };
    }

    // Categorical X and Numerical Y (Group averages)
    if (
      (profX.role === "categorical" && profY.role === "numerical") ||
      (profY.role === "categorical" && profX.role === "numerical")
    ) {
      return {
        type: "Aggregated Bar Chart",
        reason: `One categorical and one numerical field selected. Aggregated mean comparison Bar Charts deliver immediate comparison across groups.`,
        suitableTypes: ["bar_agg"],
      };
    }

    // Logical fallback
    return {
      type: "Bar Chart with Multi-variable groups",
      reason: `Comparing attributes. Regular categorized values render cleanly on horizontal bar charts.`,
      suitableTypes: ["bar_freq"],
    };
  }, [colX, colY, profiles]);

  // Auto set recommended chart type
  React.useEffect(() => {
    if (recommendation && !chartType) {
      setChartType(recommendation.suitableTypes[0] || "bar_freq");
    }
  }, [recommendation, chartType]);

  // Handle Dimension Swapping
  const swapDimensions = () => {
    const temp = colX;
    setColX(colY);
    setColY(temp);
    setChartType("");
  };

  // Pre-process Chart Data
  const chartData = useMemo(() => {
    if (!colX) return [];

    const profX = profiles.find(p => p.name === colX);
    const profY = profiles.find(p => p.name === colY);

    if (!profX) return [];

    // 1. Single categorical column breakdown or frequency (bar_freq, or pie)
    if (chartType === "bar_freq" || chartType === "pie") {
      const colStats = stats[colX];
      if (colStats && colStats.frequencies) {
        return colStats.frequencies.slice(0, 10).map(f => ({
          name: f.value,
          Count: f.count,
          Percentage: parseFloat(f.percentage.toFixed(1)),
        }));
      }
    }

    // 2. Numerical Histogram (histogram)
    if (chartType === "histogram" && profX.role === "numerical") {
      const vals = rows
        .map(r => Number(String(r[colX]).replace(/[\$,%]/g, "")))
        .filter(v => !isNaN(v))
        .sort((a, b) => a - b);

      if (vals.length > 0) {
        const min = vals[0];
        const max = vals[vals.length - 1];
        const numBins = 10;
        const binWidth = (max - min) / numBins || 1;
        const bins = Array.from({ length: numBins }, (_, idx) => {
          const lBound = min + idx * binWidth;
          const uBound = lBound + binWidth;
          return {
            name: `[${lBound.toFixed(1)} - ${uBound.toFixed(1)}]`,
            min: lBound,
            max: uBound,
            Frequency: 0,
          };
        });

        vals.forEach(v => {
          let bIdx = Math.floor((v - min) / binWidth);
          if (bIdx >= numBins) bIdx = numBins - 1;
          if (bIdx < 0) bIdx = 0;
          bins[bIdx].Frequency++;
        });

        return bins;
      }
    }

    // 3. Time Series Line Chart (line)
    if (chartType === "line") {
      const dateKey = profX.role === "date" ? colX : colY;
      const numKey = profX.role === "numerical" ? colX : colY;

      if (!dateKey || !numKey) return [];

      const pairs = rows
        .map(r => {
          const parsedD = Date.parse(String(r[dateKey]));
          const numV = Number(String(r[numKey]).replace(/[\$,%]/g, ""));
          return {
            dateStr: String(r[dateKey]),
            time: parsedD,
            value: numV,
          };
        })
        .filter(p => !isNaN(p.time) && !isNaN(p.value))
        .sort((a, b) => a.time - b.time);

      // Group/bin dates if rows count is extreme (>100)
      if (pairs.length > 50) {
        // Just slice or sample to keep it elegant and readable
        const step = Math.ceil(pairs.length / 50);
        return pairs.filter((_, idx) => idx % step === 0).map(p => ({
          name: p.dateStr,
          [numKey]: parseFloat(p.value.toFixed(2)),
        }));
      }

      return pairs.map(p => ({
        name: p.dateStr,
        [numKey]: parseFloat(p.value.toFixed(2)),
      }));
    }

    // 4. Aggregated values grouped by Category (bar_agg)
    if (chartType === "bar_agg") {
      const catKey = profX.role === "categorical" ? colX : colY;
      const numKey = profX.role === "numerical" ? colX : colY;

      if (!catKey || !numKey) return [];

      const groups: { [cat: string]: { sum: number; count: number } } = {};
      rows.forEach(r => {
        const catVal = String(r[catKey]).trim() || "N/A";
        const numVal = Number(String(r[numKey]).replace(/[\$,%]/g, ""));
        if (!isNaN(numVal)) {
          if (!groups[catVal]) groups[catVal] = { sum: 0, count: 0 };
          groups[catVal].sum += numVal;
          groups[catVal].count++;
        }
      });

      return Object.entries(groups)
        .map(([name, stats]) => ({
          name,
          Average: parseFloat((stats.sum / stats.count).toFixed(2)),
          Sum: parseFloat(stats.sum.toFixed(2)),
          Count: stats.count,
        }))
        .sort((a, b) => b.Average - a.Average)
        .slice(0, 15); // Limit categories to be visually striking
    }

    // 5. Scatter Plot (scatter)
    if (chartType === "scatter" && profX.role === "numerical" && profY?.role === "numerical") {
      return rows
        .map(r => {
          const valX = Number(String(r[colX]).replace(/[\$,%]/g, ""));
          const valY = Number(String(r[colY]).replace(/[\$,%]/g, ""));
          return {
            x: valX,
            y: valY,
          };
        })
        .filter(p => !isNaN(p.x) && !isNaN(p.y))
        .slice(0, 300); // Limit size for performance
    }

    return [];
  }, [colX, colY, chartType, rows, stats, profiles]);

  const COLORS = ["#3A56C5", "#1D9E75", "#7057C8", "#D08B30", "#C24168", "#6B6960"];

  return (
    <div className="space-y-6" id="visualization_engine_container">
      {/* Configuration panel */}
      <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
        <h3 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-iris" />
          Dimension Selection & Recommendations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">X-Axis Column</label>
            <select
              value={colX}
              onChange={e => {
                setColX(e.target.value);
                setChartType("");
              }}
              className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              id="select_xaxis_column"
            >
              <option value="">-- Choose X-Axis --</option>
              {profiles.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-400">Y-Axis Column (Optional)</label>
              {colX && colY && (
                <button
                  onClick={swapDimensions}
                  className="text-xxs text-emerald-600 hover:underline"
                  id="swap_axis_btn"
                >
                  Swap Axis
                </button>
              )}
            </div>
            <select
              value={colY}
              onChange={e => {
                setColY(e.target.value);
                setChartType("");
              }}
              className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              id="select_yaxis_column"
            >
              <option value="">-- Single Column Profile --</option>
              {profiles.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Chart Style</label>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              id="select_chart_style"
            >
              <option value="">Select Chart Style</option>
              <option value="bar_freq">Value Count Bar Chart</option>
              <option value="pie">Proportional Pie Chart</option>
              <option value="histogram">Distribution Histogram</option>
              <option value="line">Trend Line Chart</option>
              <option value="scatter">Bivariate Scatter Plot</option>
              <option value="bar_agg">Group Average Bar Chart</option>
            </select>
          </div>
        </div>

        {/* Suggestion alert */}
        {recommendation && (
          <div className="mt-4 p-3.5 bg-iris-light/65 border border-indigo-100 rounded-lg flex gap-3">
            <Lightbulb className="h-5 w-5 text-iris shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-iris font-display">
                AI Recommendation: {recommendation.type}
              </span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {recommendation.reason}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rendering State checks */}
      {!colX ? (
        <div className="bg-[#F7F8FC] rounded-xl border border-dashed border-indigo-100 p-12 text-center text-stone">
          <HelpCircle className="h-10 w-10 mx-auto text-stone mb-2" />
          <p className="text-sm">Please select an X-Axis variable from the configuration box above to start plotting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chart Viewer */}
          <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs flex flex-col justify-between min-h-[460px]">
            <div className="flex justify-between items-center border-b border-indigo-50 pb-3 mb-4">
              <h4 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5 capitalize">
                <span>{chartType.replace("_", " ")}: </span>
                <span className="text-iris">
                  {colX} {colY && colX !== colY && `vs ${colY}`}
                </span>
              </h4>
              <span className="text-xxs bg-iris-light text-iris px-2.5 py-1 rounded-full font-mono">
                {chartData.length} Bins/Values plotted
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-stone">
                <AlertCircle className="h-8 w-8 text-amber mb-2" />
                <p className="text-sm">No compatible records. Try picking other types or another Chart Style.</p>
              </div>
            ) : (
              <div className="relative flex-1 w-full min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "bar_freq" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Bar dataKey="Count" fill="#3A56C5" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  ) : chartType === "bar_agg" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Bar dataKey="Average" fill="#1D9E75" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  ) : chartType === "histogram" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Bar dataKey="Frequency" fill="#7057C8" radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                  ) : chartType === "line" ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey={profiles.find(p => p.name === colX)?.role === "numerical" ? colX : colY}
                        stroke="#3A56C5"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : chartType === "scatter" ? (
                    <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" dataKey="x" name={colX} stroke="#9ca3af" fontSize={11} />
                      <YAxis type="number" dataKey="y" name={colY} stroke="#9ca3af" fontSize={11} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Scatter name={`${colX} vs ${colY}`} data={chartData} fill="#7057C8" />
                    </ScatterChart>
                  ) : chartType === "pie" ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="Count"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  ) : null}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Statistics helper side board */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Profile Summary: {colX}
            </h4>

            {stats[colX] ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Type Status</span>
                  <span className="font-semibold text-gray-700 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md inline-block font-mono mt-1">
                    {profiles.find(p => p.name === colX)?.detectedType}
                  </span>
                </div>

                {profiles.find(p => p.name === colX)?.role === "numerical" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-gray-400 block font-medium">Mean Average</span>
                        <span className="font-mono text-sm text-gray-800 font-semibold">
                          {stats[colX].mean?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Median</span>
                        <span className="font-mono text-sm text-gray-800 font-semibold">
                          {stats[colX].median?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-gray-400 block font-medium">Std Dev</span>
                        <span className="font-mono text-sm text-gray-700">
                          {stats[colX].std?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Outliers</span>
                        <span className="font-mono text-sm text-red-600 font-semibold">
                          {stats[colX].outliersCount ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-gray-400 block font-medium">Min Bound</span>
                        <span className="font-mono text-sm text-gray-700">
                          {stats[colX].min?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Max Bound</span>
                        <span className="font-mono text-sm text-gray-700">
                          {stats[colX].max?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-100 pt-3 space-y-2.5">
                      <div>
                        <span className="text-gray-400 block font-medium">Distinct Categories</span>
                        <span className="font-mono text-sm text-gray-800 font-semibold">
                          {stats[colX].uniqueValues}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Dominant Category</span>
                        <span className="font-semibold text-gray-800">
                          "{stats[colX].topCategory}"
                        </span>
                        <span className="text-gray-400 block mt-0.5">
                          Count: {stats[colX].topCategoryCount} rows
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Computing statistics...</p>
            )}
          </div>
        </div>
      )}

      {/* Pearson Correlation Heatmap */}
      {correlationMatrix && (
        <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
          <h3 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#C24168]" />
            Bivariate Pearson Correlation Heatmap
          </h3>
          <p className="text-xs text-stone mb-5 leading-relaxed">
            Pearson coefficient measures the linear relationship between variables. Values near +1 indicate strong positive correlation (Rose Coral), near -1 indicate strong negative correlation (Iris Blue), and near 0 indicate no linear correlation.
          </p>

          <div className="overflow-x-auto">
            <div className="min-w-[500px] border border-indigo-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F8FC] border-b border-indigo-50">
                    <th className="p-3 font-semibold text-stone-dark font-mono">Metrics</th>
                    {numericalCols.map(c => (
                      <th key={c.name} className="p-3 font-semibold text-stone-dark text-center font-mono truncate max-w-[120px]">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numericalCols.map(ca => (
                    <tr key={ca.name} className="border-b border-indigo-50/20 hover:bg-[#F7F8FC]/40">
                      <td className="p-3 font-medium text-slate-700 font-mono truncate max-w-[153px]">{ca.name}</td>
                      {numericalCols.map(cb => {
                        const val = correlationMatrix[ca.name]?.[cb.name] ?? 0;
                        // Color styling from Iris Blue (-1) -> white (0) -> Rose Coral (+1)
                        let bgStyle = { backgroundColor: "rgba(255, 255, 255, 1)" };
                        let textColor = "text-slate-700";

                        if (val > 0) {
                          // Rose Coral is rgb(194, 65, 104)
                          bgStyle = { backgroundColor: `rgba(194, 65, 104, ${val.toFixed(2)})` };
                          textColor = val > 0.4 ? "text-white" : "text-slate-800";
                        } else if (val < 0) {
                          // Iris Blue is rgb(58, 86, 197)
                          bgStyle = { backgroundColor: `rgba(58, 86, 197, ${Math.abs(val).toFixed(2)})` };
                          textColor = Math.abs(val) > 0.4 ? "text-white" : "text-slate-800";
                        }

                        return (
                          <td
                            key={cb.name}
                            style={bgStyle}
                            className={`p-3 text-center font-mono font-bold transition-all ${textColor}`}
                            title={`correlation between ${ca.name} and ${cb.name}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
