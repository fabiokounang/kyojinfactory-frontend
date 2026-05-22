export type PofStatus = 'DRAFT' | 'RELEASED' | 'COMPLETED' | 'CANCELLED';

export interface PofLine {
  id: number;
  prodOrderFormId: number;
  customerPoLineId: number;
  lineNo: number;
  productNumber: string;
  itemName: string;
  cpoQty: number | null;
  qtyToProduce: number;
  qtyProduced: number;
  remainingOnPofLine: number;
  unit: string;
  bomVersionId: number | null;
  bomVersionName: string | null;
  bomVersionStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PofSummary {
  id: number;
  pofNumber: string;
  customerPoId: number;
  poNumber: string;
  cpoStatus: string;
  customer: { id: number; code: string; name: string };
  status: PofStatus;
  supervisorUserId: number | null;
  supervisorName: string | null;
  issuedByUserId: number | null;
  issuedByName: string | null;
  createdBy: number | null;
  createdByName: string | null;
  notes: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pof extends PofSummary {
  lines: PofLine[];
}

export interface EligibleCustomerPo {
  id: number;
  poNumber: string;
  poDate: string;
  customer: { id: number; code: string; name: string };
  linesTotal: number;
  linesWithBom: number;
  isReady: boolean;
  hasRemaining: boolean;
  remainingQty: number;
  allocatedQty: number;
  poQty: number;
}

export interface PrefillLine {
  customerPoLineId: number;
  lineNo: number;
  itemName: string;
  productNumber: string;
  cpoQty: number;
  poQty: number;
  allocatedQty: number;
  remainingQty: number;
  unit: string;
  masterItemId: number | null;
  bomVersionId: number | null;
  bomVersionName: string | null;
}

export interface PrefillData {
  po: EligibleCustomerPo;
  lines: PrefillLine[];
}

export interface PofLineInput {
  customerPoLineId: number;
  productNumber: string;
  qtyToProduce: number;
  unit: string;
  bomVersionId: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface PofInput {
  customerPoId: number;
  supervisorUserId?: number | null;
  issuedByUserId?: number | null;
  notes?: string | null;
  lines: PofLineInput[];
}

export interface UserAssignee {
  id: number;
  fullName: string;
  role: string;
}
