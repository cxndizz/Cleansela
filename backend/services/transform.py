import pandas as pd
import numpy as np
import os
from typing import Dict, Any, List, Optional
import logging
from app.models import RuleSet
from app.services.processor import (
    apply_dtype, 
    apply_imputation, 
    apply_transform,
    apply_validation,
    apply_outlier_detection,
    apply_deduplication
)

logger = logging.getLogger(__name__)

def apply_rules_preview(
    file_path: str, 
    rules: Optional[RuleSet] = None
) -> Dict[str, Any]:
    """Apply rules to preview data (first 200 rows)"""
    preview_rows = 200
    
    try:
        # Read the file
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in [".xls", ".xlsx"]:
            df = pd.read_excel(file_path, dtype=str, nrows=preview_rows)
        else:
            df = pd.read_csv(
                file_path,
                dtype=str,
                nrows=preview_rows,
                on_bad_lines='skip',
                low_memory=False
            )
        
        warnings = []
        
        # Apply rules if provided
        if rules and rules.columns:
            # Apply data types and transforms
            for column_rule in rules.columns:
                column_name = column_rule.name
                
                if column_name not in df.columns:
                    warnings.append(f"Column '{column_name}' not found")
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
                
                # Apply validations
                if column_rule.validations:
                    for validation in column_rule.validations:
                        column_warnings = apply_validation(df, column_name, validation.dict())
                        warnings.extend(column_warnings)
            
            # Apply deduplicate
            if rules.deduplicate:
                df = apply_deduplication(df, rules.deduplicate)
            
            # Apply outlier detection
            if rules.outliers:
                df = apply_outlier_detection(df, rules.outliers.dict())
        
        # Infer column types for response
        columns = []
        for column in df.columns:
            inferred_type = "String"
            if pd.api.types.is_integer_dtype(df[column]):
                inferred_type = "Integer"
            elif pd.api.types.is_float_dtype(df[column]):
                inferred_type = "Float"
            elif pd.api.types.is_bool_dtype(df[column]):
                inferred_type = "Boolean"
            elif pd.api.types.is_datetime64_dtype(df[column]):
                has_time = False
                for val in df[column].dropna():
                    if hasattr(val, "time") and val.time() != pd.Timestamp("00:00:00").time():
                        has_time = True
                        break
                inferred_type = "Datetime" if has_time else "Date"
            
            columns.append({
                "name": column,
                "inferredType": inferred_type
            })
        
        # Convert DataFrame to list of dictionaries for JSON response
        rows = df.replace({np.nan: None}).head(20).to_dict('records')
        
        return {
            "columns": columns,
            "rows": rows,
            "warnings": warnings
        }
    
    except Exception as e:
        logger.error(f"Error applying rules preview: {e}")
        raise