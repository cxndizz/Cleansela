import pandas as pd
import numpy as np
import chardet
import csv
import os
import io
from app.models import ColumnDType, FileType
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def detect_encoding(content: bytes) -> Dict[str, str]:
    """Detect encoding and delimiter from file content"""
    result = {"encoding": "utf-8", "delimiter": ","}
    
    # Detect encoding
    detection = chardet.detect(content)
    if detection and detection["confidence"] > 0.7:
        result["encoding"] = detection["encoding"]
    
    # Detect delimiter
    try:
        content_str = content.decode(result["encoding"], errors="replace")
        # Try to guess delimiter by checking for common ones
        delimiters = [",", ";", "\t", "|"]
        max_count = 0
        for delim in delimiters:
            count = content_str.count(delim)
            if count > max_count:
                max_count = count
                result["delimiter"] = delim
    except Exception as e:
        logger.warning(f"Error detecting delimiter: {e}")
    
    return result

def infer_column_type(series: pd.Series) -> ColumnDType:
    """Infer the data type of a pandas Series"""
    # Check for missing data
    if series.isna().all():
        return ColumnDType.STRING
    
    # Get non-null values for inference
    non_null = series.dropna()
    if len(non_null) == 0:
        return ColumnDType.STRING
    
    # Check if boolean
    if pd.api.types.is_bool_dtype(non_null):
        return ColumnDType.BOOLEAN
    
    # Check if integer
    if pd.api.types.is_integer_dtype(non_null):
        return ColumnDType.INTEGER
    
    # Check if float
    if pd.api.types.is_float_dtype(non_null):
        return ColumnDType.FLOAT
    
    # Check if date
    try:
        pd.to_datetime(non_null, errors='raise')
        # Check if time component is present
        sample = pd.to_datetime(non_null.iloc[0])
        if sample.time() == pd.Timestamp('00:00:00').time():
            return ColumnDType.DATE
        else:
            return ColumnDType.DATETIME
    except:
        pass
    
    # Check if categorical (less than 10 unique values)
    if len(non_null.unique()) < 10 and len(non_null) > 20:
        return ColumnDType.CATEGORY
    
    # Check if JSON (sample a few values)
    import json
    sample_size = min(5, len(non_null))
    json_count = 0
    for val in non_null.sample(sample_size):
        try:
            if isinstance(val, str) and (val.startswith('{') or val.startswith('[')):
                json.loads(val)
                json_count += 1
        except:
            pass
    
    if json_count == sample_size:
        return ColumnDType.JSON
    
    # Default to string
    return ColumnDType.STRING

def parse_sample(
    file_path: str, 
    file_type: FileType,
    encoding: str = "utf-8", 
    has_header: bool = True,
    delimiter: Optional[str] = None
) -> Dict[str, Any]:
    """Parse a sample of the file (first 200 rows)"""
    sample_rows = 200
    
    try:
        if file_type in [FileType.XLS, FileType.XLSX]:
            # Parse Excel file
            df = pd.read_excel(
                file_path, 
                header=0 if has_header else None,
                nrows=sample_rows
            )
        else:
            # Parse CSV/TSV/TXT file
            df = pd.read_csv(
                file_path,
                encoding=encoding,
                header=0 if has_header else None,
                delimiter=delimiter,
                nrows=sample_rows,
                on_bad_lines='skip',
                low_memory=False
            )
        
        # If no header, create default column names
        if not has_header:
            df.columns = [f"Column_{i+1}" for i in range(len(df.columns))]
        
        # Infer column types
        column_types = {}
        for col in df.columns:
            column_types[col] = infer_column_type(df[col])
        
        # Convert DataFrame to list of dictionaries for JSON response
        rows = df.replace({np.nan: None}).to_dict('records')
        
        # Prepare column info
        columns = [
            {"name": col, "inferredType": column_types[col]}
            for col in df.columns
        ]
        
        return {
            "columns": columns,
            "rows": rows,
        }
    
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        raise Exception(f"Error parsing file: {e}")