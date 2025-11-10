# backend/app/services/processor.py
import pandas as pd
import numpy as np
import os
import time
import json
from typing import Dict, Any, List, Optional
import logging
from app.models import RuleSet, ExportOptions, ColumnDType, ImputeStrategy, TransformType, OutlierMethod, OutlierAction
from app.services.parser import infer_column_type
from app.services.validate import validate_column
from app.services.export import export_data
from rq import get_current_job

logger = logging.getLogger(__name__)

def update_progress(progress: float):
    """Update job progress"""
    job = get_current_job()
    if job:
        job.meta["progress"] = progress
        job.save_meta()

def apply_dtype(df: pd.DataFrame, column: str, dtype: ColumnDType) -> pd.DataFrame:
    """Apply data type to column"""
    try:
        if dtype == ColumnDType.INTEGER:
            df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0).astype(int)
        elif dtype == ColumnDType.FLOAT:
            df[column] = pd.to_numeric(df[column], errors="coerce")
        elif dtype == ColumnDType.BOOLEAN:
            df[column] = df[column].astype(str).map({"true": True, "false": False, "1": True, "0": False, "yes": True, "no": False, "y": True, "n": False}).fillna(False)
        elif dtype == ColumnDType.DATE:
            df[column] = pd.to_datetime(df[column], errors="coerce").dt.date
        elif dtype == ColumnDType.DATETIME:
            df[column] = pd.to_datetime(df[column], errors="coerce")
        elif dtype == ColumnDType.CATEGORY:
            df[column] = df[column].astype("category")
        elif dtype == ColumnDType.JSON:
            # Keep as string, but could validate JSON
            pass
        else:  # String
            df[column] = df[column].astype(str)
    except Exception as e:
        logger.warning(f"Error applying dtype {dtype} to column {column}: {e}")
    
    return df

def apply_imputation(df: pd.DataFrame, column: str, impute: Dict[str, Any]) -> pd.DataFrame:
    """Apply imputation to column"""
    strategy = impute.get("strategy", ImputeStrategy.NONE)
    
    if strategy == ImputeStrategy.NONE:
        return df
    
    # Determine which rows have missing values
    mask = df[column].isna()
    if not mask.any():
        return df  # No missing values
    
    # Apply imputation based on strategy
    if strategy == ImputeStrategy.VALUE:
        value = impute.get("value")
        if value is not None:
            df.loc[mask, column] = value
    elif strategy == ImputeStrategy.MEAN:
        if pd.api.types.is_numeric_dtype(df[column]):
            df.loc[mask, column] = df[column].mean()
    elif strategy == ImputeStrategy.MEDIAN:
        if pd.api.types.is_numeric_dtype(df[column]):
            df.loc[mask, column] = df[column].median()
    elif strategy == ImputeStrategy.MODE:
        mode_value = df[column].mode()
        if not mode_value.empty:
            df.loc[mask, column] = mode_value.iloc[0]
    elif strategy == ImputeStrategy.FORWARD_FILL:
        df[column] = df[column].ffill()
    elif strategy == ImputeStrategy.BACKWARD_FILL:
        df[column] = df[column].bfill()
    
    return df

def apply_transform(df: pd.DataFrame, column: str, transform: Dict[str, Any]) -> pd.DataFrame:
    """Apply transform to column"""
    transform_type = transform.get("type")
    
    try:
        if transform_type == TransformType.TRIM:
            df[column] = df[column].astype(str).str.strip()
        
        elif transform_type == TransformType.LOWER:
            df[column] = df[column].astype(str).str.lower()
        
        elif transform_type == TransformType.UPPER:
            df[column] = df[column].astype(str).str.upper()
        
        elif transform_type == TransformType.TITLE:
            df[column] = df[column].astype(str).str.title()
        
        elif transform_type == TransformType.REPLACE:
            pattern = transform.get("pattern", "")
            replacement = transform.get("replacement", "")
            df[column] = df[column].astype(str).str.replace(pattern, replacement, regex=True)
        
        elif transform_type == TransformType.EXTRACT:
            pattern = transform.get("pattern", "")
            df[column] = df[column].astype(str).str.extract(f"({pattern})", expand=False)
        
        elif transform_type == TransformType.PARSE_DATE:
            format = transform.get("format", "%Y-%m-%d")
            timezone = transform.get("timezone")
            df[column] = pd.to_datetime(df[column], format=format, errors="coerce")
            if timezone:
                df[column] = df[column].dt.tz_localize("UTC").dt.tz_convert(timezone)
        
        elif transform_type == TransformType.PARSE_NUMBER:
            locale = transform.get("locale")
            if locale:
                # This is simplified; real implementation would handle locale-specific formatting
                df[column] = df[column].astype(str).str.replace(",", ".")
            df[column] = pd.to_numeric(df[column], errors="coerce")
        
        elif transform_type == TransformType.MAP_VALUES:
            mapping = transform.get("mapping", {})
            df[column] = df[column].map(mapping).fillna(df[column])
        
        elif transform_type == TransformType.SPLIT:
            delimiter = transform.get("delimiter", ",")
            # This creates a new column with the split result
            # In a real app, we'd need to handle this more carefully
            new_column = f"{column}_split"
            df[new_column] = df[column].astype(str).str.split(delimiter)
        
        elif transform_type == TransformType.JOIN:
            delimiter = transform.get("delimiter", " ")
            # This assumes the column contains lists
            df[column] = df[column].apply(
                lambda x: delimiter.join(x) if isinstance(x, list) else x
            )
    
    except Exception as e:
        logger.warning(f"Error applying transform {transform_type} to column {column}: {e}")
    
    return df

def apply_validation(df: pd.DataFrame, column: str, validation: Dict[str, Any]) -> List[str]:
    """Apply validation to column and return warnings"""
    return validate_column(df, column, validation)

def apply_outlier_detection(df: pd.DataFrame, outliers: Dict[str, Any]) -> pd.DataFrame:
    """Apply outlier detection and handling"""
    method = outliers.get("method")
    columns = outliers.get("columns", [])
    action = outliers.get("action", OutlierAction.CAP)
    
    for column in columns:
        if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
            continue
        
        try:
            # IQR method
            if method == OutlierMethod.IQR:
                Q1 = df[column].quantile(0.25)
                Q3 = df[column].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                if action == OutlierAction.CAP:
                    # Cap outliers to bounds
                    df[column] = df[column].clip(lower=lower_bound, upper=upper_bound)
                elif action == OutlierAction.REMOVE:
                    # Mark outliers as NaN
                    mask = (df[column] < lower_bound) | (df[column] > upper_bound)
                    df.loc[mask, column] = np.nan
            
            # Z-score method
            elif method == OutlierMethod.ZSCORE:
                mean = df[column].mean()
                std = df[column].std()
                z_scores = (df[column] - mean) / std
                
                if action == OutlierAction.CAP:
                    # Cap values with |z| > 3
                    df.loc[z_scores > 3, column] = mean + 3 * std
                    df.loc[z_scores < -3, column] = mean - 3 * std
                elif action == OutlierAction.REMOVE:
                    # Mark outliers as NaN
                    mask = abs(z_scores) > 3
                    df.loc[mask, column] = np.nan
        
        except Exception as e:
            logger.warning(f"Error applying outlier detection to column {column}: {e}")
    
    return df

def apply_deduplication(df: pd.DataFrame, deduplicate: Dict[str, Any]) -> pd.DataFrame:
    """Apply deduplication"""
    subset = deduplicate.get("subset", [])
    
    if not subset:
        return df
    
    # Ensure all columns in subset exist
    valid_subset = [col for col in subset if col in df.columns]
    
    if not valid_subset:
        return df
    
    # Remove duplicates
    return df.drop_duplicates(subset=valid_subset, keep="first")

def process_file(
    file_path: str, 
    rules: RuleSet, 
    export_options: ExportOptions, 
    job_id: str, 
    upload_id: str
) -> Dict[str, Any]:
    """Process file with rules and export"""
    job = get_current_job()
    
    try:
        # Update job status
        update_progress(0.1)
        
        # Read the file
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in [".xls", ".xlsx"]:
            df = pd.read_excel(file_path, dtype=str)
        else:
            df = pd.read_csv(
                file_path,
                delimiter=export_options.delimiter or ",",
                encoding=export_options.encoding or "utf-8",
                dtype=str,
                on_bad_lines='skip',
                low_memory=False
            )
        
        # Update job status
        update_progress(0.2)
        
        # Apply data types
        for i, column_rule in enumerate(rules.columns):
            column_name = column_rule.name
            
            if column_name not in df.columns:
                continue
            
            # Apply data type
            df = apply_dtype(df, column_name, column_rule.dtype)
            
            # Apply imputation
            if column_rule.impute:
                df = apply_imputation(df, column_name, column_rule.impute.dict())
            
            # Apply transformations
            if column_rule.transforms:
                for transform in column_rule.transforms:
                    df = apply_transform(df, column_name, transform.dict())
            
            # Progress update per column
            progress = 0.2 + (0.5 * (i + 1) / len(rules.columns))
            update_progress(progress)
        
        # Apply deduplicate
        if rules.deduplicate:
            df = apply_deduplication(df, rules.deduplicate)
        
        # Apply outlier detection
        if rules.outliers:
            df = apply_outlier_detection(df, rules.outliers.dict())
        
        # Update job status
        update_progress(0.8)
        
        # Export data
        output_dir = os.path.join(os.path.dirname(file_path), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        download_path = export_data(df, export_options, output_dir)
        
        # Update job status
        update_progress(1.0)
        
        # Set download URL
        if job:
            job.meta["download_url"] = download_path
            job.save_meta()
        
        return {"download_url": download_path}
    
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise