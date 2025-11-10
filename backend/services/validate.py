# backend/app/services/validate.py
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from app.models import ValidationType

logger = logging.getLogger(__name__)

def validate_required(df: pd.DataFrame, column: str) -> List[str]:
    """Validate that column has no missing values"""
    warnings = []
    mask = df[column].isna()
    if mask.any():
        count = mask.sum()
        warnings.append(f"Column '{column}' has {count} missing values")
    return warnings

def validate_unique(df: pd.DataFrame, column: str) -> List[str]:
    """Validate that column has no duplicate values"""
    warnings = []
    mask = df[column].duplicated()
    if mask.any():
        count = mask.sum()
        warnings.append(f"Column '{column}' has {count} duplicate values")
    return warnings

def validate_min_max(df: pd.DataFrame, column: str, min_value: Optional[Any] = None, max_value: Optional[Any] = None) -> List[str]:
    """Validate that column values are within min and max range"""
    warnings = []
    
    if not pd.api.types.is_numeric_dtype(df[column]):
        warnings.append(f"Column '{column}' is not numeric, min/max validation skipped")
        return warnings
    
    if min_value is not None:
        mask = df[column] < min_value
        if mask.any():
            count = mask.sum()
            warnings.append(f"Column '{column}' has {count} values below minimum {min_value}")
    
    if max_value is not None:
        mask = df[column] > max_value
        if mask.any():
            count = mask.sum()
            warnings.append(f"Column '{column}' has {count} values above maximum {max_value}")
    
    return warnings

def validate_regex(df: pd.DataFrame, column: str, pattern: str) -> List[str]:
    """Validate that column values match regex pattern"""
    warnings = []
    
    try:
        mask = ~df[column].astype(str).str.match(pattern)
        if mask.any():
            count = mask.sum()
            warnings.append(f"Column '{column}' has {count} values that don't match pattern '{pattern}'")
    except Exception as e:
        warnings.append(f"Error validating regex pattern for '{column}': {str(e)}")
    
    return warnings

def validate_allowed_set(df: pd.DataFrame, column: str, allowed: List[Any]) -> List[str]:
    """Validate that column values are in allowed set"""
    warnings = []
    
    if not allowed:
        return warnings
    
    mask = ~df[column].isin(allowed)
    if mask.any():
        count = mask.sum()
        invalid_values = df.loc[mask, column].unique()[:5]  # Show up to 5 invalid values
        warnings.append(f"Column '{column}' has {count} values not in allowed set. Some invalid values: {', '.join(map(str, invalid_values))}")
    
    return warnings

def validate_date_range(df: pd.DataFrame, column: str, min_date: Optional[str] = None, max_date: Optional[str] = None) -> List[str]:
    """Validate that dates are within range"""
    warnings = []
    
    if not pd.api.types.is_datetime64_dtype(df[column]):
        warnings.append(f"Column '{column}' is not a date/datetime, date range validation skipped")
        return warnings
    
    if min_date:
        try:
            min_date_dt = pd.to_datetime(min_date)
            mask = df[column] < min_date_dt
            if mask.any():
                count = mask.sum()
                warnings.append(f"Column '{column}' has {count} dates before {min_date}")
        except Exception as e:
            warnings.append(f"Error validating min date for '{column}': {str(e)}")
    
    if max_date:
        try:
            max_date_dt = pd.to_datetime(max_date)
            mask = df[column] > max_date_dt
            if mask.any():
                count = mask.sum()
                warnings.append(f"Column '{column}' has {count} dates after {max_date}")
        except Exception as e:
            warnings.append(f"Error validating max date for '{column}': {str(e)}")
    
    return warnings

def validate_column(df: pd.DataFrame, column: str, validation: Dict[str, Any]) -> List[str]:
    """Apply validation to column and return warnings"""
    validation_type = validation.get("type")
    warnings = []
    
    try:
        if validation_type == ValidationType.REQUIRED:
            warnings.extend(validate_required(df, column))
        
        elif validation_type == ValidationType.UNIQUE:
            warnings.extend(validate_unique(df, column))
        
        elif validation_type == ValidationType.MIN:
            min_value = validation.get("value")
            warnings.extend(validate_min_max(df, column, min_value=min_value))
        
        elif validation_type == ValidationType.MAX:
            max_value = validation.get("value")
            warnings.extend(validate_min_max(df, column, max_value=max_value))
        
        elif validation_type == ValidationType.REGEX:
            pattern = validation.get("pattern", "")
            warnings.extend(validate_regex(df, column, pattern))
        
        elif validation_type == ValidationType.ALLOWED_SET:
            allowed = validation.get("allowed", [])
            warnings.extend(validate_allowed_set(df, column, allowed))
        
        elif validation_type == ValidationType.DATE_RANGE:
            min_date = validation.get("min")
            max_date = validation.get("max")
            warnings.extend(validate_date_range(df, column, min_date, max_date))
    
    except Exception as e:
        logger.warning(f"Error applying validation {validation_type} to column {column}: {e}")
        warnings.append(f"Error validating '{column}': {str(e)}")
    
    return warnings