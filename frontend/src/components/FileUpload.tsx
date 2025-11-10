import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { UploadResponse } from "@/types/schema";
import { uploadFile } from "@/lib/api";
import { UploadCloud } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess: (response: UploadResponse) => void;
}

const ENCODINGS = [
  { value: "utf-8", label: "UTF-8" },
  { value: "iso-8859-1", label: "ISO-8859-1" },
  { value: "windows-1252", label: "Windows-1252" },
  { value: "tis-620", label: "TIS-620 (Thai)" },
  { value: "windows-874", label: "Windows-874 (Thai)" },
  { value: "shift_jis", label: "Shift-JIS (Japanese)" },
  { value: "gb2312", label: "GB2312 (Chinese)" },
  { value: "euc-kr", label: "EUC-KR (Korean)" },
];

const DELIMITERS = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
];

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<string>("utf-8");
  const [delimiter, setDelimiter] = useState<string>(",");
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [useAutoDetect, setUseAutoDetect] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [detectedEncoding, setDetectedEncoding] = useState<string | null>(null);
  const [detectedDelimiter, setDetectedDelimiter] = useState<string | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("encoding", encoding);
      formData.append("has_header", hasHeader.toString());
      if (delimiter) formData.append("delimiter", delimiter);
      
      // Upload file with progress tracking
      const response = await uploadFile(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 100)
        );
        setProgress(percentCompleted);
      });
      
      // Set detected values
      if (response.detect) {
        setDetectedEncoding(response.detect.encoding || null);
        setDetectedDelimiter(response.detect.delimiter || null);
        
        // Auto-apply detected values if auto-detect is enabled
        if (useAutoDetect) {
          if (response.detect.encoding) setEncoding(response.detect.encoding);
          if (response.detect.delimiter) setDelimiter(response.detect.delimiter);
        }
      }
      
      onUploadSuccess(response);
    } catch (error) {
      console.error("Upload error:", error);
      // Handle error through toast in parent component
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-gray-50 cursor-pointer transition-colors">
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p className="text-xs text-gray-500 mt-1">
          รองรับ .csv, .xls, .xlsx, .tsv, .txt (ขนาดสูงสุด 50MB)
        </p>
      </div>
      
      {file && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <p className="font-medium">ไฟล์ที่เลือก: {file.name}</p>
                <p className="text-sm text-gray-500">
                  ขนาด: {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="encoding">Encoding</Label>
                  <Select value={encoding} onValueChange={setEncoding}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Encoding" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENCODINGS.map((enc) => (
                        <SelectItem key={enc.value} value={enc.value}>
                          {enc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedEncoding && (
                    <p className="text-xs text-gray-500">
                      ตรวจพบ: {detectedEncoding}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delimiter">Delimiter</Label>
                  <Select value={delimiter} onValueChange={setDelimiter}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกตัวคั่น" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIMITERS.map((del) => (
                        <SelectItem key={del.value} value={del.value}>
                          {del.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedDelimiter && (
                    <p className="text-xs text-gray-500">
                      ตรวจพบ: {
                        detectedDelimiter === "\t" 
                          ? "Tab" 
                          : `'${detectedDelimiter}'`
                      }
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="has-header"
                  checked={hasHeader}
                  onCheckedChange={setHasHeader}
                />
                <Label htmlFor="has-header">มีแถวหัวตาราง</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-detect"
                  checked={useAutoDetect}
                  onCheckedChange={setUseAutoDetect}
                />
                <Label htmlFor="auto-detect">ใช้ค่าที่ตรวจจับอัตโนมัติ</Label>
              </div>
              
              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-500 text-center">
                    {progress}% กำลังอัปโหลด...
                  </p>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}