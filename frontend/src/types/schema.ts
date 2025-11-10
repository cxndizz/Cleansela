// frontend/src/types/schema.ts

// ชนิดข้อมูลพื้นฐาน
export enum FileType {
  CSV = "csv",
  XLS = "xls",
  XLSX = "xlsx",
  TSV = "tsv",
  TXT = "txt",
}

export enum ColumnDType {
  STRING = "String",
  INTEGER = "Integer",
  FLOAT = "Float",
  BOOLEAN = "Boolean",
  DATE = "Date",
  DATETIME = "Datetime",
  CATEGORY = "Category",
  JSON = "JSON",
}

export enum ImputeStrategy {
  NONE = "none",
  VALUE = "value",
  MEAN = "mean",
  MEDIAN = "median",
  MODE = "mode",
  FORWARD_FILL = "ffill",
  BACKWARD_FILL = "bfill",
}

export enum TransformType {
  TRIM = "trim",
  LOWER = "lower",
  UPPER = "upper",
  TITLE = "title",
  REPLACE = "replace",
  EXTRACT = "extract",
  PARSE_DATE = "parseDate",
  PARSE_NUMBER = "parseNumber",
  MAP_VALUES = "mapValues",
  SPLIT = "split",
  JOIN = "join",
}

export enum ValidationType {
  REQUIRED = "required",
  UNIQUE = "unique",
  MIN = "min",
  MAX = "max",
  REGEX = "regex",
  ALLOWED_SET = "allowedSet",
  DATE_RANGE = "dateRange",
}

export enum OutlierMethod {
  IQR = "IQR",
  ZSCORE = "ZSCORE",
}

export enum OutlierAction {
  CAP = "cap",
  REMOVE = "remove",
}

export enum JobStatus {
  QUEUED = "queued",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ตัวอย่างข้อมูล
export interface SampleData {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
}

export interface ColumnInfo {
  name: string;
  inferredType: ColumnDType;
}

// Rule definitions
export interface Transform {
  type: TransformType;
  pattern?: string;
  replacement?: string;
  format?: string;
  timezone?: string;
  locale?: string;
  mapping?: Record<string, any>;
  delimiter?: string;
}

export interface Validation {
  type: ValidationType;
  value?: any;
  min?: any;
  max?: any;
  pattern?: string;
  allowed?: any[];
}

export interface Impute {
  strategy: ImputeStrategy;
  value?: any;
}

export interface ColumnRule {
  name: string;
  dtype: ColumnDType;
  transforms?: Transform[];
  validations?: Validation[];
  impute?: Impute;
}

export interface Outliers {
  method: OutlierMethod;
  columns: string[];
  action: OutlierAction;
}

export interface RuleSet {
  columns: ColumnRule[];
  deduplicate?: { subset: string[] } | null;
  outliers?: Outliers | null;
}

// API Request/Response types
export interface UploadResponse {
  upload_id: string;
  sample: SampleData;
  detect: {
    encoding: string;
    delimiter: string;
  };
  file_type: FileType;
}

export interface PreviewRequest {
  upload_id: string;
  rules?: RuleSet;
}

export interface PreviewResponse {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  warnings?: string[];
}

export interface ExportOptions {
  format: string;
  delimiter?: string;
  encoding?: string;
  quote_style?: string;
  line_ending?: string;
  sheet_name?: string;
  date_format?: string;
  number_format?: string;
  na_rep?: string;
  selected_columns?: string[];
}

export interface ProcessRequest {
  upload_id: string;
  rules: RuleSet;
  export: ExportOptions;
}

export interface ProcessResponse {
  job_id: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  download_url?: string;
  error?: string;
}