# backend/app/services/export.py
import pandas as pd
import numpy as np
import os
import csv
import json
import logging
from typing import Dict, Any, List, Optional
from app.models import ExportOptions

logger = logging.getLogger(__name__)

def get_quote_style(style_str: str) -> int:
    """Convert string quote style to csv module constant"""
    styles = {
        "minimal": csv.QUOTE_MINIMAL,
        "all": csv.QUOTE_ALL,
        "nonnumeric": csv.QUOTE_NONNUMERIC,
        "none": csv.QUOTE_NONE
    }
    
    return styles.get(style_str.lower(), csv.QUOTE_MINIMAL)

def format_dataframe(df: pd.DataFrame, options: ExportOptions) -> pd.DataFrame:
    """Format DataFrame based on export options before saving"""
    # Select columns if specified
    if options.selected_columns:
        valid_columns = [col for col in options.selected_columns if col in df.columns]
        if valid_columns:
            df = df[valid_columns]
    
    # Format date columns if date_format specified
    if options.date_format:
        for col in df.select_dtypes(include=['datetime64']).columns:
            try:
                df[col] = df[col].dt.strftime(options.date_format)
            except Exception as e:
                logger.warning(f"Error formatting date column {col}: {e}")
    
    # Format number columns if number_format specified
    if options.number_format:
        for col in df.select_dtypes(include=['number']).columns:
            try:
                # This is a simplified version - real implementation would be more complex
                if options.number_format == "comma":
                    df[col] = df[col].apply(lambda x: f"{x:,}" if not pd.isna(x) else options.na_rep)
                elif options.number_format == "percent":
                    df[col] = df[col].apply(lambda x: f"{x:.2%}" if not pd.isna(x) else options.na_rep)
                # Add more number formats as needed
            except Exception as e:
                logger.warning(f"Error formatting number column {col}: {e}")
    
    return df

def export_to_csv(df: pd.DataFrame, output_path: str, options: ExportOptions) -> None:
    """Export DataFrame to CSV"""
    df = format_dataframe(df, options)
    
    df.to_csv(
        output_path,
        index=False,
        sep=options.delimiter or ",",
        encoding=options.encoding or "utf-8",
        quoting=get_quote_style(options.quote_style or "minimal"),
        line_terminator=options.line_ending or "\n",
        na_rep=options.na_rep or ""
    )

def export_to_excel(df: pd.DataFrame, output_path: str, options: ExportOptions) -> None:
    """Export DataFrame to Excel"""
    df = format_dataframe(df, options)
    
    with pd.ExcelWriter(output_path) as writer:
        df.to_excel(
            writer,
            sheet_name=options.sheet_name or "Sheet1",
            index=False,
            na_rep=options.na_rep or ""
        )

def export_to_parquet(df: pd.DataFrame, output_path: str, options: ExportOptions) -> None:
    """Export DataFrame to Parquet"""
    # Select columns if specified
    if options.selected_columns:
        valid_columns = [col for col in options.selected_columns if col in df.columns]
        if valid_columns:
            df = df[valid_columns]
    
    df.to_parquet(output_path, index=False)

def export_to_json(df: pd.DataFrame, output_path: str, options: ExportOptions) -> None:
    """Export DataFrame to JSON"""
    # Select columns if specified
    if options.selected_columns:
        valid_columns = [col for col in options.selected_columns if col in df.columns]
        if valid_columns:
            df = df[valid_columns]
    
    # Replace NaN with None for JSON compatibility
    df = df.replace({np.nan: None})
    
    # Export to JSON (records format)
    df.to_json(output_path, orient="records", lines=True)

def export_data(df: pd.DataFrame, options: ExportOptions, output_path: str) -> str:
    """Export data to specified format and return the file path"""
    format = options.format.lower()
    file_name = f"cleaned_data.{format}"
    full_path = os.path.join(output_path, file_name)
    
    # Export based on format
    if format == "csv":
        export_to_csv(df, full_path, options)
    elif format == "xlsx":
        export_to_excel(df, full_path, options)
    elif format == "parquet":
        export_to_parquet(df, full_path, options)
    elif format == "json":
        export_to_json(df, full_path, options)
    else:
        raise ValueError(f"Unsupported export format: {format}")
    
    # Return relative path for download URL
    return f"tmp/{os.path.basename(os.path.dirname(output_path))}/output/{file_name}"