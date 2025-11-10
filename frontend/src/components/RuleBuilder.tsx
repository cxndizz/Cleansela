import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RuleSet, Transform, Validation, ImputeStrategy } from "@/types/schema";
import { previewData } from "@/lib/api";
import { toast } from "sonner";

interface RuleBuilderProps {
  ruleSet: RuleSet;
  onRuleChange: (ruleSet: RuleSet) => void;
  uploadId: string;
}

export default function RuleBuilder({ ruleSet, onRuleChange, uploadId }: RuleBuilderProps) {
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Set initial active column
  useEffect(() => {
    if (!activeColumn && ruleSet.columns.length > 0) {
      setActiveColumn(ruleSet.columns[0].name);
    }
  }, [ruleSet.columns, activeColumn]);

  // Get current column
  const currentColumn = ruleSet.columns.find(col => col.name === activeColumn);

  // Apply rules and get preview data
  const applyRulesPreview = async () => {
    if (!uploadId) return;
    
    setIsLoading(true);
    
    try {
      const response = await previewData(uploadId, ruleSet);
      setPreviewRows(response.rows.slice(0, 20));
      
      if (response.warnings && response.warnings.length > 0) {
        toast.warning("คำเตือน", {
          description: response.warnings.join(", ")
        });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", {
        description: error instanceof Error ? error.message : "ไม่สามารถแสดงตัวอย่างได้"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add transform
  const addTransform = (type: string) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0) return;
    
    // Create transform based on type
    let transform: Transform = { type };
    
    // Add default values based on transform type
    switch (type) {
      case "replace":
        transform = { ...transform, pattern: "", replacement: "" };
        break;
      case "extract":
        transform = { ...transform, pattern: "" };
        break;
      case "parseDate":
        transform = { ...transform, format: "%Y-%m-%d" };
        break;
      case "mapValues":
        transform = { ...transform, mapping: {} };
        break;
      case "split":
      case "join":
        transform = { ...transform, delimiter: "," };
        break;
    }
    
    newRuleSet.columns[columnIndex].transforms = [
      ...(newRuleSet.columns[columnIndex].transforms || []),
      transform
    ];
    
    onRuleChange(newRuleSet);
  };

  // Remove transform
  const removeTransform = (index: number) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0) return;
    
    newRuleSet.columns[columnIndex].transforms = newRuleSet.columns[columnIndex].transforms.filter(
      (_, i) => i !== index
    );
    
    onRuleChange(newRuleSet);
  };

  // Add validation
  const addValidation = (type: string) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0) return;
    
    // Create validation based on type
    let validation: Validation = { type };
    
    // Add default values based on validation type
    switch (type) {
      case "min":
      case "max":
        validation = { ...validation, value: 0 };
        break;
      case "regex":
        validation = { ...validation, pattern: "" };
        break;
      case "allowedSet":
        validation = { ...validation, allowed: [] };
        break;
      case "dateRange":
        validation = { ...validation, min: null, max: null };
        break;
    }
    
    newRuleSet.columns[columnIndex].validations = [
      ...(newRuleSet.columns[columnIndex].validations || []),
      validation
    ];
    
    onRuleChange(newRuleSet);
  };

  // Remove validation
  const removeValidation = (index: number) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0) return;
    
    newRuleSet.columns[columnIndex].validations = newRuleSet.columns[columnIndex].validations.filter(
      (_, i) => i !== index
    );
    
    onRuleChange(newRuleSet);
  };

  // Set imputation strategy
  const setImputation = (strategy: ImputeStrategy, value?: any) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0) return;
    
    newRuleSet.columns[columnIndex].impute = { strategy, value };
    
    onRuleChange(newRuleSet);
  };

  // Set deduplication
  const setDeduplication = (enabled: boolean) => {
    const newRuleSet = { ...ruleSet };
    
    if (enabled) {
      if (activeColumn) {
        newRuleSet.deduplicate = { subset: [activeColumn] };
      }
    } else {
      newRuleSet.deduplicate = null;
    }
    
    onRuleChange(newRuleSet);
  };

  // Set outlier detection
  const setOutlierDetection = (enabled: boolean, method: string = "IQR", action: string = "cap") => {
    const newRuleSet = { ...ruleSet };
    
    if (enabled && activeColumn) {
      newRuleSet.outliers = {
        method,
        columns: [activeColumn],
        action
      };
    } else {
      newRuleSet.outliers = null;
    }
    
    onRuleChange(newRuleSet);
  };

  // Update transform parameters
  const updateTransform = (index: number, param: string, value: any) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0 || !newRuleSet.columns[columnIndex].transforms[index]) return;
    
    newRuleSet.columns[columnIndex].transforms[index] = {
      ...newRuleSet.columns[columnIndex].transforms[index],
      [param]: value
    };
    
    onRuleChange(newRuleSet);
  };

  // Update validation parameters
  const updateValidation = (index: number, param: string, value: any) => {
    if (!currentColumn) return;
    
    const newRuleSet = { ...ruleSet };
    const columnIndex = newRuleSet.columns.findIndex(col => col.name === activeColumn);
    
    if (columnIndex < 0 || !newRuleSet.columns[columnIndex].validations[index]) return;
    
    newRuleSet.columns[columnIndex].validations[index] = {
      ...newRuleSet.columns[columnIndex].validations[index],
      [param]: value
    };
    
    onRuleChange(newRuleSet);
  };

  // Render transform form
  const renderTransformForm = (transform: Transform, index: number) => {
    switch (transform.type) {
      case "trim":
      case "lower":
      case "upper":
      case "title":
        return (
          <div className="flex justify-between items-center">
            <div className="text-sm">{getTransformLabel(transform.type)}</div>
            <Button variant="ghost" size="sm" onClick={() => removeTransform(index)}>
              ลบ
            </Button>
          </div>
        );
      
      case "replace":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">แทนที่ข้อความ</div>
              <Button variant="ghost" size="sm" onClick={() => removeTransform(index)}>
                ลบ
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`transform-pattern-${index}`}>ค้นหา (regex)</Label>
                <Input
                  id={`transform-pattern-${index}`}
                  value={transform.pattern || ""}
                  onChange={(e) => updateTransform(index, "pattern", e.target.value)}
                  placeholder="a-z+"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`transform-replacement-${index}`}>แทนที่ด้วย</Label>
                <Input
                  id={`transform-replacement-${index}`}
                  value={transform.replacement || ""}
                  onChange={(e) => updateTransform(index, "replacement", e.target.value)}
                  placeholder="replacement"
                />
              </div>
            </div>
          </div>
        );
      
      case "extract":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">แยกข้อความ</div>
              <Button variant="ghost" size="sm" onClick={() => removeTransform(index)}>
                ลบ
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`transform-pattern-${index}`}>รูปแบบ (regex)</Label>
              <Input
                id={`transform-pattern-${index}`}
                value={transform.pattern || ""}
                onChange={(e) => updateTransform(index, "pattern", e.target.value)}
                placeholder="(\\d+)"
              />
            </div>
          </div>
        );
      
      case "parseDate":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">แปลงเป็นวันที่</div>
              <Button variant="ghost" size="sm" onClick={() => removeTransform(index)}>
                ลบ
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`transform-format-${index}`}>รูปแบบ</Label>
                <Input
                  id={`transform-format-${index}`}
                  value={transform.format || "%Y-%m-%d"}
                  onChange={(e) => updateTransform(index, "format", e.target.value)}
                  placeholder="%Y-%m-%d"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`transform-timezone-${index}`}>ไทม์โซน (ถ้ามี)</Label>
                <Input
                  id={`transform-timezone-${index}`}
                  value={transform.timezone || ""}
                  onChange={(e) => updateTransform(index, "timezone", e.target.value)}
                  placeholder="Asia/Bangkok"
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex justify-between items-center">
            <div className="text-sm">{getTransformLabel(transform.type)}</div>
            <Button variant="ghost" size="sm" onClick={() => removeTransform(index)}>
              ลบ
            </Button>
          </div>
        );
    }
  };

  // Render validation form
  const renderValidationForm = (validation: Validation, index: number) => {
    switch (validation.type) {
      case "required":
      case "unique":
        return (
          <div className="flex justify-between items-center">
            <div className="text-sm">{getValidationLabel(validation.type)}</div>
            <Button variant="ghost" size="sm" onClick={() => removeValidation(index)}>
              ลบ
            </Button>
          </div>
        );
      
      case "min":
      case "max":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">{getValidationLabel(validation.type)}</div>
              <Button variant="ghost" size="sm" onClick={() => removeValidation(index)}>
                ลบ
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`validation-value-${index}`}>ค่า</Label>
              <Input
                id={`validation-value-${index}`}
                type="number"
                value={validation.value || 0}
                onChange={(e) => updateValidation(index, "value", parseFloat(e.target.value))}
              />
            </div>
          </div>
        );
      
      case "regex":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">รูปแบบ Regex</div>
              <Button variant="ghost" size="sm" onClick={() => removeValidation(index)}>
                ลบ
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`validation-pattern-${index}`}>รูปแบบ</Label>
              <Input
                id={`validation-pattern-${index}`}
                value={validation.pattern || ""}
                onChange={(e) => updateValidation(index, "pattern", e.target.value)}
                placeholder="^[^@]+@[^@]+\.[^@]+$"
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex justify-between items-center">
            <div className="text-sm">{getValidationLabel(validation.type)}</div>
            <Button variant="ghost" size="sm" onClick={() => removeValidation(index)}>
              ลบ
            </Button>
          </div>
        );
    }
  };

  // Get transform label
  const getTransformLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      trim: "ตัดช่องว่าง",
      lower: "ตัวพิมพ์เล็ก",
      upper: "ตัวพิมพ์ใหญ่",
      title: "ตัวพิมพ์ใหญ่ตัวแรก",
      replace: "แทนที่ข้อความ",
      extract: "แยกข้อความด้วย Regex",
      parseDate: "แปลงเป็นวันที่",
      parseNumber: "แปลงเป็นตัวเลข",
      mapValues: "แมปค่า",
      split: "แยกข้อความ",
      join: "รวมข้อความ"
    };
    
    return labels[type] || type;
  };

  // Get validation label
  const getValidationLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      required: "ต้องมีค่า",
      unique: "ต้องไม่ซ้ำกัน",
      min: "ค่าต่ำสุด",
      max: "ค่าสูงสุด",
      regex: "รูปแบบ Regex",
      allowedSet: "ค่าที่อนุญาต",
      dateRange: "ช่วงวันที่"
    };
    
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Select
          value={activeColumn || ""}
          onValueChange={setActiveColumn}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกคอลัมน์" />
          </SelectTrigger>
          <SelectContent>
            {ruleSet.columns.map((col) => (
              <SelectItem key={col.name} value={col.name}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={applyRulesPreview} disabled={isLoading}>
          {isLoading ? "กำลังประมวลผล..." : "แสดงตัวอย่าง"}
        </Button>
      </div>
      
      {currentColumn && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="transform">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="transform">แปลงข้อมูล</TabsTrigger>
                  <TabsTrigger value="validation">ตรวจสอบ</TabsTrigger>
                  <TabsTrigger value="impute">เติมค่าที่หาย</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transform" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>เพิ่มการแปลง</Label>
                      <Select onValueChange={addTransform}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="เพิ่ม..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trim">ตัดช่องว่าง</SelectItem>
                          <SelectItem value="lower">ตัวพิมพ์เล็ก</SelectItem>
                          <SelectItem value="upper">ตัวพิมพ์ใหญ่</SelectItem>
                          <SelectItem value="title">ตัวพิมพ์ใหญ่ตัวแรก</SelectItem>
                          <SelectItem value="replace">แทนที่ข้อความ</SelectItem>
                          <SelectItem value="extract">แยกข้อความด้วย Regex</SelectItem>
                          <SelectItem value="parseDate">แปลงเป็นวันที่</SelectItem>
                          <SelectItem value="parseNumber">แปลงเป็นตัวเลข</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {currentColumn.transforms.length === 0 ? (
                      <div className="text-sm text-gray-500 p-4 border border-dashed rounded-md text-center">
                        ยังไม่มีการแปลง เลือกเพิ่มจากเมนูด้านบน
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentColumn.transforms.map((transform, index) => (
                          <div 
                            key={index} 
                            className="p-3 border rounded-md"
                          >
                            {renderTransformForm(transform, index)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="validation" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>เพิ่มการตรวจสอบ</Label>
                      <Select onValueChange={addValidation}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="เพิ่ม..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">ต้องมีค่า</SelectItem>
                          <SelectItem value="unique">ต้องไม่ซ้ำกัน</SelectItem>
                          <SelectItem value="min">ค่าต่ำสุด</SelectItem>
                          <SelectItem value="max">ค่าสูงสุด</SelectItem>
                          <SelectItem value="regex">รูปแบบ Regex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {currentColumn.validations.length === 0 ? (
                      <div className="text-sm text-gray-500 p-4 border border-dashed rounded-md text-center">
                        ยังไม่มีการตรวจสอบ เลือกเพิ่มจากเมนูด้านบน
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentColumn.validations.map((validation, index) => (
                          <div 
                            key={index} 
                            className="p-3 border rounded-md"
                          >
                            {renderValidationForm(validation, index)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="impute" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>กลยุทธ์การเติมค่าที่หาย</Label>
                    <Select 
                      value={currentColumn.impute.strategy}
                      onValueChange={(value) => setImputation(value as ImputeStrategy)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกกลยุทธ์" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ไม่เติม</SelectItem>
                        <SelectItem value="value">เติมด้วยค่าเฉพาะ</SelectItem>
                        <SelectItem value="mean">ค่าเฉลี่ย (สำหรับตัวเลข)</SelectItem>
                        <SelectItem value="median">ค่ามัธยฐาน (สำหรับตัวเลข)</SelectItem>
                        <SelectItem value="mode">ค่าฐานนิยม (ค่าที่พบบ่อยสุด)</SelectItem>
                        <SelectItem value="ffill">คัดลอกค่าก่อนหน้า</SelectItem>
                        <SelectItem value="bfill">คัดลอกค่าถัดไป</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {currentColumn.impute.strategy === "value" && (
                      <div className="mt-2">
                        <Label htmlFor="impute-value">ค่าที่ต้องการเติม</Label>
                        <Input
                          id="impute-value"
                          value={currentColumn.impute.value || ""}
                          onChange={(e) => setImputation("value", e.target.value)}
                          placeholder="ค่าที่ต้องการเติม"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="deduplicate"
                        checked={!!ruleSet.deduplicate && ruleSet.deduplicate.subset.includes(currentColumn.name)}
                        onCheckedChange={setDeduplication}
                      />
                      <Label htmlFor="deduplicate">ลบแถวที่ซ้ำกันในคอลัมน์นี้</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="outlier"
                        checked={!!ruleSet.outliers && ruleSet.outliers.columns.includes(currentColumn.name)}
                        onCheckedChange={setOutlierDetection}
                      />
                      <Label htmlFor="outlier">จัดการค่าผิดปกติในคอลัมน์นี้</Label>
                    </div>
                    
                    {!!ruleSet.outliers && ruleSet.outliers.columns.includes(currentColumn.name) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor="outlier-method">วิธีการ</Label>
                          <Select
                            value={ruleSet.outliers.method}
                            onValueChange={(value) => setOutlierDetection(true, value, ruleSet.outliers?.action || "cap")}
                          >
                            <SelectTrigger id="outlier-method">
                              <SelectValue placeholder="เลือกวิธีการ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IQR">IQR (Interquartile Range)</SelectItem>
                              <SelectItem value="ZSCORE">Z-Score</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="outlier-action">การจัดการ</Label>
                          <Select
                            value={ruleSet.outliers.action}
                            onValueChange={(value) => setOutlierDetection(true, ruleSet.outliers?.method || "IQR", value)}
                          >
                            <SelectTrigger id="outlier-action">
                              <SelectValue placeholder="เลือกการจัดการ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cap">จำกัดค่าสูงสุด/ต่ำสุด</SelectItem>
                              <SelectItem value="remove">ลบค่าผิดปกติ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="font-medium mb-2">ตัวอย่างผลลัพธ์: {currentColumn.name}</div>
              
              {isLoading ? (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <div className="mt-2">กำลังประมวลผล...</div>
                </div>
              ) : previewRows.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">
                          ข้อมูลที่เปลี่ยน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="px-2 py-1 text-sm">
                            {row[currentColumn.name] === null || row[currentColumn.name] === undefined ? (
                              <span className="text-gray-400 italic">null</span>
                            ) : (
                              String(row[currentColumn.name])
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 border border-dashed rounded-md text-center">
                  กดปุ่ม "แสดงตัวอย่าง" เพื่อดูผลลัพธ์
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}