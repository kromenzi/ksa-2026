export type SafetySignStatus = "Draft" | "Active" | "Under Review" | "Expired" | "Archived";

export type SafetySignCategoryName = 
  | "Fire Safety" 
  | "PPE" 
  | "Electrical" 
  | "Machinery" 
  | "Traffic" 
  | "Chemical" 
  | "General";

export interface SafetySignRevision {
  id: string;
  revisionNumber: string;
  revisionDate: string;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  status: SafetySignStatus;
  notes?: string;
  imageUrl?: string;
}

export interface SafetySign {
  id: string;
  signName: string;
  titleAr: string;
  titleEn: string;
  category: string; // e.g. "Fire Safety", "PPE", etc.
  subType?: string; // e.g. "Fire Extinguisher", "High Voltage", etc.
  zone?: string; // المنطقة
  department?: string; // القسم
  location?: string; // الموقع
  signType?: string; // e.g. "Warning" | "Mandatory" | "Prohibition" | "Emergency" | "Information"
  description?: string;
  safetyInstructionsAr?: string[];
  safetyInstructionsEn?: string[];
  status: SafetySignStatus;
  documentNumber: string; // e.g. SS-FS-001
  revision: string; // e.g. "Rev.01"
  issueDate: string;
  reviewDate?: string;
  imageUrl?: string;
  originalFileName?: string;
  fileSize?: string;
  mimeType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string; // 'pdf' | 'word' | 'image' | string
  attachmentSize?: string;
  printCount?: number;
  viewCount?: number;
  lastPrintedAt?: string;
  lastPrintedBy?: string;
  qrCodeUrl?: string;
  relatedDocumentIds?: string[]; // Linked Document IDs from Documents module
  revisions?: SafetySignRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetySignCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  iconName: string;
  color: string;
  itemsEn: string[];
  itemsAr: string[];
}
