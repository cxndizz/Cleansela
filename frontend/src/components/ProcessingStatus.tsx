import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { JobStatus } from "@/types/schema";
import { AlertCircle, CheckCircle, Clock, Download } from "lucide-react";

interface ProcessingStatusProps {
  status: JobStatus | null;
  progress: number;
  downloadUrl: string | null;
}

export default function ProcessingStatus({
  status,
  progress,
  downloadUrl,
}: ProcessingStatusProps) {
  // Render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case "queued":
        return <Clock className="h-8 w-8 text-gray-500" />;
      case "running":
        return (
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        );
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (): string => {
    switch (status) {
      case "completed":
        return "เสร็จแล้ว";
      case "failed":
        return "ล้มเหลว";
      case "queued":
        return "รอคิวประมวลผล";
      case "running":
        return "กำลังประมวลผล";
      default:
        return "ไม่ทราบสถานะ";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div>{renderStatusIcon()}</div>
        <div>
          <div className="font-medium">{getStatusText()}</div>
          <div className="text-sm text-gray-500">
            {status === "running"
              ? `ความคืบหน้า ${Math.round(progress * 100)}%`
              : status === "completed"
              ? "พร้อมให้ดาวน์โหลด"
              : status === "failed"
              ? "มีข้อผิดพลาด โปรดลองอีกครั้ง"
              : "กรุณารอสักครู่"}
          </div>
        </div>
      </div>

      {status === "running" && (
        <Progress value={progress * 100} className="h-2" />
      )}

      {status === "completed" && downloadUrl && (
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={() => window.location.href = downloadUrl}
          >
            <Download className="mr-2 h-5 w-5" />
            ดาวน์โหลดผลลัพธ์
          </Button>
        </div>
      )}

      {status === "failed" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          เกิดข้อผิดพลาดในการประมวลผลข้อมูล กรุณาตรวจสอบรูปแบบไฟล์และกฎที่ตั้งไว้
          แล้วลองอีกครั้ง
        </div>
      )}
    </div>
  );
}