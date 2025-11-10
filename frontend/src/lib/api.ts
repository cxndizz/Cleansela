import axios from "axios";
import { UploadResponse, PreviewResponse, JobResponse, ProcessResponse } from "@/types/schema";

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// File upload function with progress tracking
export const uploadFile = async (
  formData: FormData,
  onProgress?: (progressEvent: any) => void
): Promise<UploadResponse> => {
  try {
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress,
    });
    
    return response.data as UploadResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Upload failed");
    }
    throw error;
  }
};

// Preview data with rules
export const previewData = async (
  uploadId: string, 
  rules?: any
): Promise<PreviewResponse> => {
  try {
    const response = await api.post(`/preview`, {
      upload_id: uploadId,
      rules: rules || null,
    });
    
    return response.data as PreviewResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Preview failed");
    }
    throw error;
  }
};

// Process data with rules
export const processData = async (
  request: any
): Promise<ProcessResponse> => {
  try {
    const response = await api.post(`/process`, {
      upload_id: request.upload_id,
      rules: request.rules,
      export: request.export,
    });
    
    return response.data as ProcessResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Processing failed");
    }
    throw error;
  }
};

// Get job status
export const getJobStatus = async (
  jobId: string
): Promise<JobResponse> => {
  try {
    const response = await api.get(`/job/${jobId}`);
    return response.data as JobResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to get job status");
    }
    throw error;
  }
};

// Delete upload
export const deleteUpload = async (
  uploadId: string
): Promise<void> => {
  try {
    await api.delete(`/upload/${uploadId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to delete upload");
    }
    throw error;
  }
};