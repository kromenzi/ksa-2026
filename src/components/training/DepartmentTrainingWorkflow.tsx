"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {  ArrowRight, Save, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { MOCK_EMPLOYEES } from "./mock-data";

export default function DepartmentTrainingWorkflow({ isAr, onCancel, onSave }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    factory: "",
    department: "",
    topic: "",
    date: "",
    time: "",
    duration: "",
    trainer: "",
    location: "",
    type: ""
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.factory || !formData.department || !formData.topic) {
        toast.error(isAr ? "يرجى تعبئة الحقول الأساسية" : "Please fill required fields");
        return;
      }
      // Auto select employees based on department
      const deptEmps = MOCK_EMPLOYEES.filter((e: any) => e.department === formData.department);
      setSelectedEmployees(deptEmps.map((e: any) => e.id));
    }
    setStep(s => s + 1);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, num: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (num === 1) setPhoto1(event.target?.result as string);
        else setPhoto2(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ ...formData, employees: selectedEmployees, photo1, photo2 });
    toast.success(isAr ? "تم إنشاء سجل التدريب بنجاح" : "Training record created successfully");
  };

  const currentDeptEmps = MOCK_EMPLOYEES.filter((e: any) => e.department === formData.department);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{isAr ? "تدريب قسم كامل" : "Department Training"}</h2>
          <p className="text-muted-foreground">{isAr ? "إنشاء سجل تدريب شامل لقسم محدد" : "Create comprehensive training record for a specific department"}</p>
        </div>
        <Button variant="outline" onClick={onCancel}>{isAr ? "إلغاء" : "Cancel"}</Button>
      </div>

      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-2 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold">{isAr ? "معلومات التدريب الأساسية" : "Basic Training Info"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "موضوع التدريب" : "Training Topic"}</label>
              <Input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder={isAr ? "مثال: سلامة الحريق" : "e.g. Fire Safety"} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "نوع التدريب" : "Training Type"}</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر النوع" : "Select Type"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Safety Induction">Safety Induction</SelectItem>
                  <SelectItem value="Toolbox Talk">Toolbox Talk</SelectItem>
                  <SelectItem value="Fire Safety">Fire Safety</SelectItem>
                  <SelectItem value="LOTO">LOTO</SelectItem>
                  <SelectItem value="PPE">PPE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "المصنع" : "Factory"}</label>
              <Select value={formData.factory} onValueChange={v => setFormData({...formData, factory: v})}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر المصنع" : "Select Factory"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Factory 1">Main Factory 1</SelectItem>
                  <SelectItem value="Factory 2">Factory 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "القسم" : "Department"}</label>
              <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر القسم" : "Select Department"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="HSE">HSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "التاريخ" : "Date"}</label>
              <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "الوقت" : "Time"}</label>
              <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "المدرب" : "Trainer"}</label>
              <Input value={formData.trainer} onChange={e => setFormData({...formData, trainer: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{isAr ? "الموقع" : "Location"}</label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleNext} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {isAr ? "التالي: اختيار الموظفين" : "Next: Select Employees"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{isAr ? "الموظفون المستهدفون" : "Target Employees"}</h3>
            <p className="text-sm font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
              {selectedEmployees.length} / {currentDeptEmps.length} {isAr ? "محدد" : "Selected"}
            </p>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedEmployees.length === currentDeptEmps.length && currentDeptEmps.length > 0}
                      onCheckedChange={(c) => {
                        if (c) setSelectedEmployees(currentDeptEmps.map((e: any) => e.id));
                        else setSelectedEmployees([]);
                      }}
                    />
                  </TableHead>
                  <TableHead>{isAr ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isAr ? "الرقم الوظيفي" : "Employee ID"}</TableHead>
                  <TableHead>{isAr ? "الوظيفة" : "Job Title"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentDeptEmps.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={(c) => {
                          if (c) setSelectedEmployees([...selectedEmployees, emp.id]);
                          else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="font-mono text-xs">{emp.id}</TableCell>
                    <TableCell>{emp.title}</TableCell>
                  </TableRow>
                ))}
                {currentDeptEmps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {isAr ? "لا يوجد موظفين في هذا القسم" : "No employees in this department"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>{isAr ? "السابق" : "Previous"}</Button>
            <Button onClick={handleNext} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {isAr ? "التالي: إرفاق الصور" : "Next: Attach Photos"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-200">
          <div>
            <h3 className="text-lg font-semibold mb-1">{isAr ? "توثيق التدريب بالصور" : "Training Photo Documentation"}</h3>
            <p className="text-sm text-muted-foreground">{isAr ? "سيتم تنسيق هذه الصور تلقائياً لتناسب نموذج A4" : "Photos will be automatically formatted to fit the A4 template"}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group">
              {photo1 ? (
                <>
                  <img src={photo1} alt="Training Activity" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" onClick={() => setPhoto1(null)}>{isAr ? "تغيير الصورة" : "Change Photo"}</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{isAr ? "صورة نشاط التدريب" : "Training Activity Photo"}</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                  <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handlePhotoUpload(e, 1)} />
                </>
              )}
            </div>

            <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group">
              {photo2 ? (
                <>
                  <img src={photo2} alt="Group Attendance" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" onClick={() => setPhoto2(null)}>{isAr ? "تغيير الصورة" : "Change Photo"}</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{isAr ? "صورة مجموعة الحضور" : "Training Group Photo"}</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                  <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handlePhotoUpload(e, 2)} />
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>{isAr ? "السابق" : "Previous"}</Button>
            <Button onClick={handleSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="h-4 w-4" /> {isAr ? "حفظ وإصدار المستند" : "Save & Generate Document"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
