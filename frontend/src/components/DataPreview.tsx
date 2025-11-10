import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RuleSet, ColumnDType } from "@/types/schema";
import { Info } from "lucide-react";

interface DataPreviewProps {
  data: any;
  ruleSet: RuleSet;
  onRuleChange: (ruleSet: RuleSet) => void;
}

export default function DataPreview({ data, ruleSet, onRuleChange }: DataPreviewProps) {
  // Prepare columns
  const columns = useMemo<ColumnDef<any>[]>(() => {
    return data.columns.map((col: any) => ({
      accessorKey: col.name,
      header: () => (
        <div className="space-y-1">
          <div className="font-medium">{col.name}</div>
          <div className="flex items-center space-x-1">
            <Select 
              value={
                ruleSet.columns.find(c => c.name === col.name)?.dtype || 
                col.inferredType || 
                "String"
              }
              onValueChange={(value) => {
                const newRuleSet = { ...ruleSet };
                const columnIndex = newRuleSet.columns.findIndex(c => c.name === col.name);
                
                if (columnIndex >= 0) {
                  newRuleSet.columns[columnIndex].dtype = value as ColumnDType;
                } else {
                  newRuleSet.columns.push({
                    name: col.name,
                    dtype: value as ColumnDType,
                    transforms: [],
                    validations: [],
                    impute: { strategy: "none" }
                  });
                }
                
                onRuleChange(newRuleSet);
              }}
            >
              <SelectTrigger className="h-7 w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="String">String</SelectItem>
                <SelectItem value="Integer">Integer</SelectItem>
                <SelectItem value="Float">Float</SelectItem>
                <SelectItem value="Boolean">Boolean</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
                <SelectItem value="Datetime">Datetime</SelectItem>
                <SelectItem value="Category">Category</SelectItem>
                <SelectItem value="JSON">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ),
      cell: ({ row, column }) => {
        const value = row.getValue(column.id);
        return (
          <div className="truncate max-w-[200px]">
            {value === null || value === undefined ? (
              <span className="text-gray-400 italic">null</span>
            ) : (
              <span>{String(value)}</span>
            )}
          </div>
        );
      },
    }));
  }, [data.columns, ruleSet, onRuleChange]);

  // Create table instance
  const table = useReactTable({
    data: data.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">ตาราง</TabsTrigger>
          <TabsTrigger value="structure">โครงสร้าง</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table">
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="sticky top-0 bg-white">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center">
                        ไม่มีข้อมูล
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            แสดง {data.rows?.length || 0} แถวแรกจากทั้งหมด
          </div>
        </TabsContent>
        
        <TabsContent value="structure">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">ข้อมูลไฟล์</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">จำนวนคอลัมน์</div>
                <div className="text-sm">{data.columns?.length || 0}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">จำนวนแถวตัวอย่าง</div>
                <div className="text-sm">{data.rows?.length || 0}</div>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mt-4 mb-2">โครงสร้างคอลัมน์</h3>
            <div className="space-y-1">
              {data.columns?.map((col: any) => (
                <div key={col.name} className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium truncate">{col.name}</div>
                  <div className="text-sm">{col.inferredType}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}