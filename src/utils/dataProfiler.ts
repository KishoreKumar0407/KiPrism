import { DataType, ColumnProfile, StatisticalSummary, DatasetSummary, CleaningConfig, CleaningLog } from "../types";

// Detect datatype for a series of values
export function detectType(values: any[]): DataType {
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "");
  if (nonNulls.length === 0) return "String";

  let isInt = true;
  let isFloat = true;
  let isBool = true;
  let isDate = true;

  const dateRegex = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/;
  const standardDateRegex = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/;

  for (const v of nonNulls) {
    const s = String(v).trim();
    if (s === "") continue;

    // Check bool
    if (s.toLowerCase() !== "true" && s.toLowerCase() !== "false" && s !== "1" && s !== "0" && s.toLowerCase() !== "y" && s.toLowerCase() !== "n") {
      isBool = false;
    }

    // Check number
    const num = Number(s.replace(/[\$,%]/g, ""));
    if (isNaN(num)) {
      isInt = false;
      isFloat = false;
    } else {
      if (!Number.isInteger(num)) {
        isInt = false;
      }
    }

    // Check date
    const d = Date.parse(s);
    if (isNaN(d) && !dateRegex.test(s) && !standardDateRegex.test(s)) {
      isDate = false;
    }
  }

  if (isInt && !isBool) return "Integer";
  if (isFloat && !isBool) return "Float";
  if (isBool) return "Boolean";
  if (isDate) return "DateTime";
  return "String";
}

// Memory usage estimation
export function estimateMemoryUsage(rows: any[]): string {
  let totalBytes = 0;
  for (const r of rows) {
    for (const key in r) {
      const val = r[key];
      if (typeof val === "number") {
        totalBytes += 8;
      } else if (typeof val === "boolean") {
        totalBytes += 4;
      } else if (typeof val === "string") {
        totalBytes += val.length * 2;
      } else if (val) {
        totalBytes += 8;
      }
    }
  }

  if (totalBytes < 1024) return `${totalBytes} B`;
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Quality profiling & type analysis
export function profileColumns(rows: any[], headers: string[]): ColumnProfile[] {
  return headers.map(name => {
    const values = rows.map(r => r[name]);
    const totalCount = values.length;
    const missingValues = values.filter(v => v === null || v === undefined || String(v).trim() === "");
    const missingCount = missingValues.length;
    const missingPercentage = (missingCount / totalCount) * 100;

    const nonNullsStr = values
      .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
      .map(v => String(v).trim());

    const distinctCount = new Set(nonNullsStr).size;
    const detectedType = detectType(values);

    let suggestedType = detectedType;
    // Suggest changes if a String column is highly numeric
    if (detectedType === "String") {
      const cleanNums = nonNullsStr.filter(v => {
        const cleaned = v.replace(/[\$,%]/g, "");
        return cleaned !== "" && !isNaN(Number(cleaned));
      });
      if (cleanNums.length > 0 && cleanNums.length / nonNullsStr.length > 0.8) {
        suggestedType = cleanNums.some(v => v.includes(".")) ? "Float" : "Integer";
      } else {
        const cleanDates = nonNullsStr.filter(v => !isNaN(Date.parse(v)));
        if (cleanDates.length > 0 && cleanDates.length / nonNullsStr.length > 0.8) {
          suggestedType = "DateTime";
        }
      }
    }

    const role =
      detectedType === "Integer" || detectedType === "Float"
        ? "numerical"
        : detectedType === "DateTime"
        ? "date"
        : detectedType === "Boolean"
        ? "boolean"
        : "categorical";

    // Detect ID-like patterns
    const isIdLike =
      (distinctCount === totalCount && totalCount > 1) ||
      (/id$/i.test(name) && distinctCount / totalCount > 0.95);

    return {
      name,
      detectedType,
      suggestedType,
      typeMatch: detectedType === suggestedType,
      role,
      missingCount,
      missingPercentage,
      distinctCount,
      isIdLike,
    };
  });
}

// Statistical functions
export function calculateStatistics(
  rows: any[],
  profile: ColumnProfile,
  outlierMethod: "IQR" | "Z-Score" = "IQR"
): StatisticalSummary {
  const colName = profile.name;
  const values = rows.map(r => r[colName]);
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "");

  if (profile.role === "numerical") {
    const nums = nonNulls
      .map(v => Number(String(v).replace(/[\$,%]/g, "")))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);

    if (nums.length === 0) {
      return { columnName: colName };
    }

    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;

    // Median
    const mid = Math.floor(nums.length / 2);
    const median = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;

    // Std
    const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
    const std = Math.sqrt(variance);

    const min = nums[0];
    const max = nums[nums.length - 1];

    // Percentiles Q1, Q3
    const getPercentile = (p: number) => {
      const idx = (nums.length - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (nums[base + 1] !== undefined) {
        return nums[base] + rest * (nums[base + 1] - nums[base]);
      }
      return nums[base];
    };

    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;

    // Outliers
    let outliersCount = 0;
    const outlierIndices: number[] = [];

    rows.forEach((r, idx) => {
      const originalVal = r[colName];
      if (originalVal === null || originalVal === undefined || String(originalVal).trim() === "") return;
      const val = Number(String(originalVal).replace(/[\$,%]/g, ""));
      if (isNaN(val)) return;

      if (outlierMethod === "IQR") {
        if (val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr) {
          outliersCount++;
          outlierIndices.push(idx);
        }
      } else {
        // Z-Score
        if (std > 0 && Math.abs((val - mean) / std) > 3) {
          outliersCount++;
          outlierIndices.push(idx);
        }
      }
    });

    // Simple Mode calculation
    const counts: { [key: number]: number } = {};
    let maxCount = 0;
    let mode = nums[0];
    nums.forEach(n => {
      counts[n] = (counts[n] || 0) + 1;
      if (counts[n] > maxCount) {
        maxCount = counts[n];
        mode = n;
      }
    });

    return {
      columnName: colName,
      mean,
      median,
      mode,
      std,
      min,
      max,
      q1,
      q3,
      iqr,
      outliersCount,
      outlierIndices,
    };
  } else {
    // Categorical or Dates or Boolean stats
    const stringVals = nonNulls.map(v => String(v).trim());
    const valCounts: { [key: string]: number } = {};
    stringVals.forEach(v => {
      valCounts[v] = (valCounts[v] || 0) + 1;
    });

    const uniqueValues = Object.keys(valCounts).length;
    const frequencies = Object.entries(valCounts)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / rows.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const topCategory = frequencies[0]?.value || "";
    const topCategoryCount = frequencies[0]?.count || 0;

    return {
      columnName: colName,
      uniqueValues,
      frequencies: frequencies.slice(0, 50), // top 50
      topCategory,
      topCategoryCount,
    };
  }
}

// Generate full breakdown of duplicate rows
export function countDuplicates(rows: any[], headers: string[]): number {
  const seen = new Set<string>();
  let dupCount = 0;
  for (const r of rows) {
    const key = headers.map(h => String(r[h])).join("||");
    if (seen.has(key)) {
      dupCount++;
    } else {
      seen.add(key);
    }
  }
  return dupCount;
}

// Advanced Pre-computed Group-By Aggregations for Natural Language Queries
export function precomputeGroupBy(rows: any[], profiles: ColumnProfile[]): any {
  const categoricalCols = profiles.filter(
    p => p.role === "categorical" && p.distinctCount <= 12 && p.distinctCount > 1
  );
  const numericalCols = profiles.filter(p => p.role === "numerical");

  const results: { [catCol: string]: { [category: string]: { [numCol: string]: { sum: number; mean: number; count: number } } } } = {};

  for (const cat of categoricalCols) {
    results[cat.name] = {};
    for (const row of rows) {
      const catVal = String(row[cat.name] || "Unknown").trim();
      if (!results[cat.name][catVal]) {
        results[cat.name][catVal] = {};
        for (const num of numericalCols) {
          results[cat.name][catVal][num.name] = { sum: 0, mean: 0, count: 0 };
        }
      }

      for (const num of numericalCols) {
        const rawVal = row[num.name];
        if (rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== "") {
          const numVal = Number(String(rawVal).replace(/[\$,%]/g, ""));
          if (!isNaN(numVal)) {
            results[cat.name][catVal][num.name].sum += numVal;
            results[cat.name][catVal][num.name].count += 1;
          }
        }
      }
    }

    // Compute Means
    for (const catVal in results[cat.name]) {
      for (const numCol in results[cat.name][catVal]) {
        const stats = results[cat.name][catVal][numCol];
        if (stats.count > 0) {
          stats.mean = stats.sum / stats.count;
        }
      }
    }
  }

  return results;
}

// Clean and run Preprocessing Pipeline
export function runCleaningPipeline(
  rows: any[],
  headers: string[],
  profiles: ColumnProfile[],
  config: CleaningConfig
): { cleanedRows: any[]; cleanedHeaders: string[]; logs: CleaningLog[] } {
  const logs: CleaningLog[] = [];
  let currentRows = JSON.parse(JSON.stringify(rows)) as any[];
  let currentHeaders = [...headers];

  const log = (step: string, status: "success" | "warning" | "info", message: string) => {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      step,
      status,
      message,
    });
  };

  log("Initialization", "info", `Starting pipeline execution with ${rows.length} rows.`);

  // 1. Convert/Correct Datatypes
  let datatypeCount = 0;
  profiles.forEach(prof => {
    const targetType = config.typeCorrections[prof.name] || prof.detectedType;
    if (targetType !== prof.detectedType) {
      currentRows.forEach(r => {
        const raw = r[prof.name];
        if (raw === null || raw === undefined || String(raw).trim() === "") return;

        if (targetType === "Integer") {
          r[prof.name] = Math.round(Number(String(raw).replace(/[\$,%]/g, ""))) || 0;
        } else if (targetType === "Float") {
          r[prof.name] = Number(String(raw).replace(/[\$,%]/g, "")) || 0;
        } else if (targetType === "Boolean") {
          const s = String(raw).toLowerCase().trim();
          r[prof.name] = s === "true" || s === "1" || s === "y" || s === "yes" || s === "active";
        } else if (targetType === "DateTime") {
          const parsed = Date.parse(String(raw));
          r[prof.name] = !isNaN(parsed) ? new Date(parsed).toISOString() : String(raw);
        } else {
          r[prof.name] = String(raw).trim();
        }
      });
      datatypeCount++;
    }
  });
  if (datatypeCount > 0) {
    log("Datatype Conversion", "success", `Successfully casted types for ${datatypeCount} columns.`);
  } else {
    log("Datatype Conversion", "info", "No column type corrections required.");
  }

  // 2. Handle Missing Values
  let rowsDroppedCount = 0;
  let filledCount = 0;

  // Let's compute statistics dynamically to replace missing values
  profiles.forEach(prof => {
    const action = config.missingValueAction[prof.name];
    if (action && action !== "ignore") {
      const stats = calculateStatistics(currentRows, prof, "IQR");

      if (action === "drop") {
        const originalCount = currentRows.length;
        currentRows = currentRows.filter(
          r => r[prof.name] !== null && r[prof.name] !== undefined && String(r[prof.name]).trim() !== ""
        );
        const dropped = originalCount - currentRows.length;
        rowsDroppedCount += dropped;
        if (dropped > 0) {
          log("Missing Values Treatment", "warning", `Dropped ${dropped} rows with missing values in "${prof.name}".`);
        }
      } else {
        // Imputation
        let replacement: any = null;
        if (action === "mean") replacement = stats.mean;
        if (action === "median") replacement = stats.median;
        if (action === "mode") replacement = stats.mode;

        if (replacement !== null && replacement !== undefined) {
          let replacedForCol = 0;
          currentRows.forEach(r => {
            if (r[prof.name] === null || r[prof.name] === undefined || String(r[prof.name]).trim() === "") {
              r[prof.name] = replacement;
              replacedForCol++;
              filledCount++;
            }
          });
          if (replacedForCol > 0) {
            log(
              "Missing Values Treatment",
              "success",
              `Filled ${replacedForCol} missing values in "${prof.name}" with calculated ${action} (${replacement.toFixed ? replacement.toFixed(2) : replacement}).`
            );
          }
        }
      }
    }
  });

  // 3. Remove duplicates
  if (config.removeDuplicates) {
    const originalCount = currentRows.length;
    const seen = new Set<string>();
    currentRows = currentRows.filter(r => {
      const key = currentHeaders.map(h => String(r[h])).join("||");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    const dupCount = originalCount - currentRows.length;
    if (dupCount > 0) {
      log("Duplicate Removal", "success", `Removed ${dupCount} duplicate rows successfully.`);
    } else {
      log("Duplicate Removal", "info", "No duplicate rows found to remove.");
    }
  }

  // 4. Handle Outliers
  let outliersTreatedCount = 0;
  profiles.forEach(prof => {
    const action = config.outlierAction[prof.name];
    if (prof.role === "numerical" && action && action !== "ignore") {
      const stats = calculateStatistics(currentRows, prof, "IQR");
      if (stats.iqr !== undefined && stats.q1 !== undefined && stats.q3 !== undefined) {
        const lowerBound = stats.q1 - 1.5 * stats.iqr;
        const upperBound = stats.q3 + 1.5 * stats.iqr;

        if (action === "remove") {
          const originalCount = currentRows.length;
          currentRows = currentRows.filter(r => {
            const raw = r[prof.name];
            if (raw === null || raw === undefined || String(raw).trim() === "") return true;
            const val = Number(String(raw).replace(/[\$,%]/g, ""));
            if (isNaN(val)) return true;
            return val >= lowerBound && val <= upperBound;
          });
          const removed = originalCount - currentRows.length;
          outliersTreatedCount += removed;
          if (removed > 0) {
            log("Outlier Treatment", "warning", `Removed ${removed} rows containing outliers in "${prof.name}".`);
          }
        } else if (action === "cap") {
          let cappedCount = 0;
          currentRows.forEach(r => {
            const raw = r[prof.name];
            if (raw === null || raw === undefined || String(raw).trim() === "") return;
            const val = Number(String(raw).replace(/[\$,%]/g, ""));
            if (isNaN(val)) return;

            if (val < lowerBound) {
              r[prof.name] = lowerBound;
              cappedCount++;
              outliersTreatedCount++;
            } else if (val > upperBound) {
              r[prof.name] = upperBound;
              cappedCount++;
              outliersTreatedCount++;
            }
          });
          if (cappedCount > 0) {
            log(
              "Outlier Treatment",
              "success",
              `Capped ${cappedCount} outliers in "${prof.name}" to IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}].`
            );
          }
        }
      }
    }
  });

  // 5. Standardize Headers
  if (config.standardizeHeaders) {
    const nameMap: { [old: string]: string } = {};
    const newHeaders = currentHeaders.map(old => {
      const standardized = old
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/__+/g, "_")
        .replace(/^_+|_+$/g, "");
      nameMap[old] = standardized;
      return standardized;
    });

    currentRows = currentRows.map(r => {
      const newRow: any = {};
      currentHeaders.forEach(old => {
        newRow[nameMap[old]] = r[old];
      });
      return newRow;
    });

    currentHeaders = newHeaders;
    log("Header Standardization", "success", "Standardized all headers to snake_case format.");
  }

  log("Pipeline Finished", "info", `Pipeline complete. Results: ${currentRows.length} rows, ${currentHeaders.length} columns.`);

  return {
    cleanedRows: currentRows,
    cleanedHeaders: currentHeaders,
    logs,
  };
}
