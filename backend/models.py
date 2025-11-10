from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from enum import Enum
import uuid

class FileType(str, Enum):
    CSV = "csv"
    XLS = "xls"
    XLSX = "xlsx"
    TSV = "tsv"
    TXT = "txt"

class ColumnDType(str, Enum):
    STRING = "String"
    INTEGER = "Integer"
    FLOAT = "Float"
    BOOLEAN = "Boolean"
    DATE = "Date"
    DATETIME = "Datetime"
    CATEGORY = "Category"
    JSON = "JSON"

class ImputeStrategy(str, Enum):
    NONE = "none"
    VALUE = "value"
    MEAN = "mean"
    MEDIAN = "median"
    MODE = "mode"
    FORWARD_FILL = "ffill"
    BACKWARD_FILL = "bfill"

class TransformType(str, Enum):
    TRIM = "trim"
    LOWER = "lower"
    UPPER = "upper"
    TITLE = "title"
    REPLACE = "replace"
    EXTRACT = "extract"
    PARSE_DATE = "parseDate"
    PARSE_NUMBER = "parseNumber"
    MAP_VALUES = "mapValues"
    SPLIT = "split"
    JOIN = "join"

class ValidationType(str, Enum):
    REQUIRED = "required"
    UNIQUE = "unique"
    MIN = "min"
    MAX = "max"
    REGEX = "regex"
    ALLOWED_SET = "allowedSet"
    DATE_RANGE = "dateRange"

class OutlierMethod(str, Enum):
    IQR = "IQR"
    ZSCORE = "ZSCORE"

class OutlierAction(str, Enum):
    CAP = "cap"
    REMOVE = "remove"

class Transform(BaseModel):
    type: TransformType
    # Additional fields based on transform type
    pattern: Optional[str] = None
    replacement: Optional[str] = None
    format: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None
    mapping: Optional[Dict[str, Any]] = None
    delimiter: Optional[str] = None
    
class Validation(BaseModel):
    type: ValidationType
    # Additional fields based on validation type
    value: Optional[Any] = None
    min: Optional[Any] = None
    max: Optional[Any] = None
    pattern: Optional[str] = None
    allowed: Optional[List[Any]] = None
    
class Impute(BaseModel):
    strategy: ImputeStrategy
    value: Optional[Any] = None
    
class ColumnRule(BaseModel):
    name: str
    dtype: ColumnDType
    transforms: Optional[List[Transform]] = Field(default_factory=list)
    validations: Optional[List[Validation]] = Field(default_factory=list)
    impute: Optional[Impute] = Field(default=None)
    
class Outliers(BaseModel):
    method: OutlierMethod
    columns: List[str]
    action: OutlierAction
    
class RuleSet(BaseModel):
    columns: List[ColumnRule]
    deduplicate: Optional[Dict[str, List[str]]] = None
    outliers: Optional[Outliers] = None
    
class ExportOptions(BaseModel):
    format: str
    delimiter: Optional[str] = ","
    encoding: Optional[str] = "utf-8"
    quote_style: Optional[str] = "minimal"
    line_ending: Optional[str] = "\n"
    sheet_name: Optional[str] = "Sheet1"
    date_format: Optional[str] = None
    number_format: Optional[str] = None
    na_rep: Optional[str] = ""
    selected_columns: Optional[List[str]] = None
    
class UploadRequest(BaseModel):
    encoding: Optional[str] = "utf-8"
    has_header: Optional[bool] = True
    delimiter: Optional[str] = None
    
class PreviewRequest(BaseModel):
    upload_id: str
    rules: Optional[RuleSet] = None
    
class ProcessRequest(BaseModel):
    upload_id: str
    rules: RuleSet
    export: ExportOptions
    
class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    
class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    download_url: Optional[str] = None
    error: Optional[str] = None
    
class UploadResponse(BaseModel):
    upload_id: str
    sample: Dict[str, Any]
    detect: Dict[str, Any]
    file_type: FileType
    
class ColumnInfo(BaseModel):
    name: str
    inferred_type: ColumnDType
    
class PreviewResponse(BaseModel):
    columns: List[ColumnInfo]
    rows: List[Dict[str, Any]]
    warnings: Optional[List[str]] = None
    
class ProcessResponse(BaseModel):
    job_id: str