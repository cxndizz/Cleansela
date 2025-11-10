"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import DataPreview from "@/components/DataPreview";
import RuleBuilder from "@/components/RuleBuilder";
import ExportOptions from "@/components/ExportOptions";
import ProcessingStatus from "@/components/ProcessingStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadResponse, RuleSet, JobStatus, ExportOptions as ExportOptionsType } from "@/types/schema";
import { processData, getJobStatus } from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [ruleSet, setRuleSet] = useState<RuleSet>({ columns: [] });
  const [exportOptions, setExportOptions] = useState<ExportOptionsType>({
    format: "csv",
    delimiter: ",",
    encoding: "utf-8",
    quote_style: "minimal",
    line_ending: "\n",
    sheet_name: "Sheet1",
    na_rep: "",
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Handle successful upload
  const handleUploadSuccess = (response: UploadResponse) => {
    setUploadResponse(response);
    
    // Initialize rule set based on columns
    const initialRuleSet: RuleSet = {
      columns: response.sample.columns.map(col => ({
        name: col.name,
        dtype: col.inferredType,
        transforms: [],
        validations: [],
        impute: { strategy: "none" }
      }))
    };
    
    setRuleSet(initialRuleSet);
    setActiveTab("preview");
    
    toast.success("อัปโหลดไฟล์สำเร็จ", {
      description: `ตรวจพบ ${response.sample.columns.length} คอลัมน์`
    });
  };

  // Handle rule changes
  const handleRuleChange = (updatedRuleSet: RuleSet) => {
    setRuleSet(updatedRuleSet);
  };

  // Handle export options changes
  const handleExportOptionsChange = (options: ExportOptionsType) => {
    setExportOptions(options);
  };

  // Process data with rules
  const handleProcessData = async () => {
    if (!uploadResponse) return;
    
    try {
      const result = await processData({
        upload_id: uploadResponse.upload_id,
        rules: ruleSet,
        export: exportOptions
      });
      
      setJobId(result.job_id);
      setJobStatus("queued");
      setActiveTab("status");
      
      // Poll for job status
      const interval = setInterval(async () => {
        if (!result.job_id) return;
        
        const status = await getJobStatus(result.job_id);
        setJobStatus(status.status);
        setProgress(status.progress);
        
        if (status.download_url) {
          setDownloadUrl(status.download_url);
        }
        
        if (status.status === "completed" || status.status === "failed") {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } catch (error) {
      toast.error("การประมวลผลล้มเหลว", {
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
      });
    }
  };

  // Reset everything
  const handleReset = () => {
    setUploadResponse(null);
    setRuleSet({ columns: [] });
    setJobId(null);
    setJobStatus(null);
    setProgress(0);
    setDownloadUrl(null);
    setActiveTab("upload");
  };

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">ทำความสะอาดข้อมูลของคุณ – ฟรีและรวดเร็ว</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">อัปโหลดไฟล์</TabsTrigger>
          <TabsTrigger value="preview" disabled={!uploadResponse}>ตัวอย่างข้อมูล</TabsTrigger>
          <TabsTrigger value="rules" disabled={!uploadResponse}>กฎและการแปลง</TabsTrigger>
          <TabsTrigger value="status" disabled={!jobId}>สถานะงาน</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>อัปโหลดไฟล์ข้อมูล</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          {uploadResponse && (
            <Card>
              <CardHeader>
                <CardTitle>ตัวอย่างข้อมูล</CardTitle>
              </CardHeader>
              <CardContent>
                <DataPreview 
                  data={uploadResponse.sample} 
                  ruleSet={ruleSet} 
                  onRuleChange={handleRuleChange}
                />
                <div className="mt-4 flex justify-end space-x-2">
                  <Button onClick={() => setActiveTab("rules")}>
                    กำหนดกฎและการแปลงข้อมูล
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="rules">
          {uploadResponse && (
            <Card>
              <CardHeader>
                <CardTitle>กำหนดกฎและการแปลงข้อมูล</CardTitle>
              </CardHeader>
              <CardContent>
                <RuleBuilder 
                  ruleSet={ruleSet} 
                  onRuleChange={handleRuleChange} 
                  uploadId={uploadResponse.upload_id}
                />
                <div className="mt-6">
                  <ExportOptions
                    options={exportOptions}
                    onOptionsChange={handleExportOptionsChange}
                    columns={uploadResponse.sample.columns.map(col => col.name)}
                  />
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab("preview")}>
                    กลับไปดูตัวอย่าง
                  </Button>
                  <Button onClick={handleProcessData}>
                    ประมวลผล
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="status">
          {jobId && (
            <Card>
              <CardHeader>
                <CardTitle>สถานะการประมวลผล</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessingStatus 
                  status={jobStatus} 
                  progress={progress} 
                  downloadUrl={downloadUrl} 
                />
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={handleReset}>
                    เริ่มใหม่
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}