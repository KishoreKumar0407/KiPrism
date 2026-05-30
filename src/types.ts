export type DataType = "Integer" | "Float" | "String" | "Boolean" | "DateTime";

export interface ColumnProfile {
  name: string;
  detectedType: DataType;
  suggestedType: DataType;
  typeMatch: boolean;
  role: "numerical" | "categorical" | "date" | "boolean";
  missingCount: number;
  missingPercentage: number;
  distinctCount: number;
  isIdLike: boolean;
}

export interface StatisticalSummary {
  columnName: string;
  mean?: number;
  median?: number;
  mode?: any;
  std?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  outliersCount?: number;
  outlierIndices?: number[];
  
  // Categorical stats
  uniqueValues?: number;
  frequencies?: { value: string; count: number; percentage: number }[];
  topCategory?: string;
  topCategoryCount?: number;
}

export interface DatasetSummary {
  name: string;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  totalMissingCount: number;
  duplicateRowsCount: number;
  isCleaned: boolean;
}

export interface CleaningConfig {
  missingValueAction: {
    [columnName: string]: "mean" | "median" | "mode" | "drop" | "ignore";
  };
  removeDuplicates: boolean;
  outlierAction: {
    [columnName: string]: "remove" | "cap" | "ignore";
  };
  typeCorrections: {
    [columnName: string]: DataType;
  };
  standardizeHeaders: boolean;
}

export interface CleaningLog {
  timestamp: string;
  step: string;
  status: "success" | "warning" | "info";
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "system";
  text: string;
  timestamp: string;
}
