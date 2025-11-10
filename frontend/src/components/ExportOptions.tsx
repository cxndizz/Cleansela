import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportOptions as ExportOptionsType } from "@/types/schema";

interface ExportOptionsProps {
  options: ExportOptionsType;
  onOptionsChange: (options: ExportOptionsType) => void;
  columns: string[];
}

export default function ExportOptions({ options, onOptionsChange, columns }: ExportOptionsProps) {
  // Update option
  const updateOption = (key: string, value: any) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  // Toggle column selection
  const toggleColumn = (column: string, checked: boolean) => {
    const selectedColumns = options.selected_columns || [];
    
    if (checked) {
      updateOption("selected_columns", [...selectedColumns, column]);
    } else {
      updateOption(
        "selected_columns",
        selectedColumns.filter((c) => c !== column)
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ตั้งค่าการส่งออก</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">รูปแบบไฟล์</Label>
            <Select
              value={options.format}
              onValueChange={(value) => updateOption("format", value)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="เลือกรูปแบบ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="encoding">Encoding</Label>
            <Select
              value={options.encoding}
              onValueChange={(value) => updateOption("encoding", value)}
            >
              <SelectTrigger id="encoding">
                <SelectValue placeholder="เลือก Encoding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf-8">UTF-8</SelectItem>
                <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                <SelectItem value="windows-1252">Windows-1252</SelectItem>
                <SelectItem value="tis-620">TIS-620 (Thai)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {options.format === "csv" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="delimiter">ตัวคั่น</Label>
                <Select
                  value={options.delimiter}
                  onValueChange={(value) => updateOption("delimiter", value)}
                >
                  <SelectTrigger id="delimiter">
                    <SelectValue placeholder="เลือกตัวคั่น" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">คอมม่า (,)</SelectItem>
                    <SelectItem value=";">เซมิโคลอน (;)</SelectItem>
                    <SelectItem value="\t">แท็บ</SelectItem>
                    <SelectItem value="|">ไปป์ (|)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quote-style">รูปแบบเครื่องหมายคำพูด</Label>
                <Select
                  value={options.quote_style}
                  onValueChange={(value) => updateOption("quote_style", value)}
                >
                  <SelectTrigger id="quote-style">
                    <SelectValue placeholder="เลือกรูปแบบ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="nonnumeric">Non-numeric</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          
          {options.format === "xlsx" && (
            <div className="space-y-2">
              <Label htmlFor="sheet-name">ชื่อชีต</Label>
              <Input
                id="sheet-name"
                value={options.sheet_name}
                onChange={(e) => updateOption("sheet_name", e.target.value)}
                placeholder="Sheet1"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="na-rep">แทนค่า NA ด้วย</Label>
            <Input
              id="na-rep"
              value={options.na_rep}
              onChange={(e) => updateOption("na_rep", e.target.value)}
              placeholder="(ว่าง)"
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <Label>เลือกคอลัมน์ (ไม่เลือก = ทุกคอลัมน์)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-36 overflow-y-auto border rounded-md p-2">
            {columns.map((column) => (
              <div key={column} className="flex items-center space-x-2">
                <Checkbox
                  id={`column-${column}`}
                  checked={
                    options.selected_columns
                      ? options.selected_columns.includes(column)
                      : false
                  }
                  onCheckedChange={(checked) =>
                    toggleColumn(column, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`column-${column}`}
                  className="text-sm cursor-pointer"
                >
                  {column}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}