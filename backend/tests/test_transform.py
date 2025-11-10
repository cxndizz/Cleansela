import pytest
import pandas as pd
import numpy as np
import os
import sys
import io
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.processor import (
    apply_dtype,
    apply_imputation,
    apply_transform,
    apply_validation,
    apply_outlier_detection,
    apply_deduplication
)
from app.models import ColumnDType, ImputeStrategy, TransformType, OutlierMethod, OutlierAction

# Helper to create test dataframe
@pytest.fixture
def sample_df():
    return pd.DataFrame({
        'id': [1, 2, 3, 4, 5],
        'name': ['John Doe', 'Jane Smith', '  Bob  ', 'Alice', None],
        'age': ['25', '30', 'invalid', '40', '35'],
        'email': ['john@example.com', 'jane@example.com', 'bob@invalid', 'alice@example.com', None],
        'date': ['2021-01-01', '2021-02-01', 'invalid', '2021-04-01', None],
        'score': [10, 20, 100, 15, None]
    })

# Test apply_dtype
def test_apply_dtype_integer(sample_df):
    df = apply_dtype(sample_df.copy(), 'age', ColumnDType.INTEGER)
    assert df['age'].dtype == np.int64
    assert df['age'].iloc[2] == 0  # Invalid value should be coerced to 0
    assert df['age'].iloc[0] == 25  # String "25" should be converted to int 25

def test_apply_dtype_float(sample_df):
    df = apply_dtype(sample_df.copy(), 'score', ColumnDType.FLOAT)
    assert df['score'].dtype == np.float64
    assert pd.isna(df['score'].iloc[4])  # None should be preserved as NaN

def test_apply_dtype_date(sample_df):
    df = apply_dtype(sample_df.copy(), 'date', ColumnDType.DATE)
    assert pd.api.types.is_datetime64_dtype(df['date'])
    assert pd.isna(df['date'].iloc[2])  # Invalid date should be NaN

def test_apply_dtype_string(sample_df):
    df = apply_dtype(sample_df.copy(), 'id', ColumnDType.STRING)
    assert df['id'].dtype == object
    assert df['id'].iloc[0] == '1'  # Number should be converted to string

# Test apply_imputation
def test_apply_imputation_value(sample_df):
    df = apply_imputation(sample_df.copy(), 'name', {'strategy': ImputeStrategy.VALUE, 'value': 'Unknown'})
    assert df['name'].iloc[4] == 'Unknown'

def test_apply_imputation_mean(sample_df):
    df = apply_dtype(sample_df.copy(), 'score', ColumnDType.FLOAT)
    df = apply_imputation(df, 'score', {'strategy': ImputeStrategy.MEAN})
    assert df['score'].iloc[4] == pytest.approx(36.25)  # Mean of 10, 20, 100, 15

def test_apply_imputation_ffill(sample_df):
    df = apply_imputation(sample_df.copy(), 'name', {'strategy': ImputeStrategy.FORWARD_FILL})
    assert df['name'].iloc[4] == 'Alice'  # Should fill with previous value

# Test apply_transform
def test_apply_transform_trim(sample_df):
    df = apply_transform(sample_df.copy(), 'name', {'type': TransformType.TRIM})
    assert df['name'].iloc[2] == 'Bob'  # Should trim whitespace

def test_apply_transform_lower(sample_df):
    df = apply_transform(sample_df.copy(), 'name', {'type': TransformType.LOWER})
    assert df['name'].iloc[0] == 'john doe'

def test_apply_transform_replace(sample_df):
    df = apply_transform(sample_df.copy(), 'email', {
        'type': TransformType.REPLACE,
        'pattern': '@.*',
        'replacement': '@example.org'
    })
    assert df['email'].iloc[0] == 'john@example.org'
    assert df['email'].iloc[2] == 'bob@example.org'

def test_apply_transform_extract(sample_df):
    df = apply_transform(sample_df.copy(), 'email', {
        'type': TransformType.EXTRACT,
        'pattern': '^([^@]+)'
    })
    assert df['email'].iloc[0] == 'john'

def test_apply_transform_parse_date(sample_df):
    df = apply_transform(sample_df.copy(), 'date', {
        'type': TransformType.PARSE_DATE,
        'format': '%Y-%m-%d'
    })
    assert pd.api.types.is_datetime64_dtype(df['date'])
    assert df['date'].iloc[0].strftime('%Y-%m-%d') == '2021-01-01'
    assert pd.isna(df['date'].iloc[2])  # Invalid date should be NaN

# Test apply_validation
def test_apply_validation_required(sample_df):
    warnings = apply_validation(sample_df.copy(), 'name', {'type': 'required'})
    assert len(warnings) == 1
    assert "missing" in warnings[0].lower()

def test_apply_validation_min(sample_df):
    df = apply_dtype(sample_df.copy(), 'score', ColumnDType.FLOAT)
    warnings = apply_validation(df, 'score', {'type': 'min', 'value': 20})
    assert len(warnings) == 1
    assert "below minimum" in warnings[0].lower()

def test_apply_validation_regex(sample_df):
    warnings = apply_validation(sample_df.copy(), 'email', {'type': 'regex', 'pattern': '^[^@]+@[^@]+\\.[^@]+$'})
    assert len(warnings) == 1
    assert "don't match pattern" in warnings[0].lower()

# Test apply_outlier_detection
def test_apply_outlier_detection_iqr_cap(sample_df):
    df = apply_dtype(sample_df.copy(), 'score', ColumnDType.FLOAT)
    df = apply_outlier_detection(df, {
        'method': OutlierMethod.IQR,
        'columns': ['score'],
        'action': OutlierAction.CAP
    })
    assert df['score'].iloc[2] < 100  # Outlier should be capped

def test_apply_outlier_detection_zscore_remove(sample_df):
    df = apply_dtype(sample_df.copy(), 'score', ColumnDType.FLOAT)
    df = apply_outlier_detection(df, {
        'method': OutlierMethod.ZSCORE,
        'columns': ['score'],
        'action': OutlierAction.REMOVE
    })
    assert pd.isna(df['score'].iloc[2])  # Outlier should be removed

# Test apply_deduplication
def test_apply_deduplication(sample_df):
    # Create duplicates
    df = pd.concat([sample_df, sample_df.iloc[[0, 1]]])
    assert len(df) == 7  # Should have 7 rows (5 original + 2 duplicates)
    
    df = apply_deduplication(df, {'subset': ['id']})
    assert len(df) == 5  # Should be back to 5 rows