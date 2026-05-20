export type VendorPoStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
export type PaymentMode = 'UPFRONT' | 'DP_THEN_RECEIPT' | 'ON_RECEIPT';

export interface VendorPoLine {
  id: number;
  vendorPoId: number;
  lineNo: number;
  itemName: string;
  masterItemId: number | null;
  qty: number;
  unit: string;
  unitPrice: number;
  ppnIncluded: boolean;
  lineAmount: number;
  stdSize: string | null;
}

export interface VendorPoVendor {
  id: number;
  code: string;
  name: string;
  phone: string | null;
}

export interface VendorPo {
  id: number;
  poNumber: string;
  vendorRef: string | null;
  poDate: string;
  vendor: VendorPoVendor;
  paymentMode: PaymentMode;
  dpAmount: number | null;
  dpDueDate: string | null;
  balanceDueDate: string | null;
  paymentTermDays: number;
  ppnRate: number;
  status: VendorPoStatus;
  statusLabel: string;
  notes: string | null;
  createdBy: number | null;
  createdByName: string | null;
  confirmedAt: string | null;
  receivedAt: string | null;
  receivedNotes: string | null;
  receivedBy: number | null;
  receivedByName: string | null;
  createdAt: string;
  updatedAt: string;
  lines: VendorPoLine[];
}

export interface VendorPoLineInput {
  itemName: string;
  masterItemId?: number | null;
  qty: number;
  unit: string;
  unitPrice: number;
  ppnIncluded: boolean;
  stdSize?: string | null;
}

export interface VendorPoInput {
  vendorId: number;
  poDate: string;
  vendorRef?: string | null;
  paymentMode: PaymentMode;
  paymentTermDays: number;
  dpAmount?: number | null;
  notes?: string | null;
  lines: VendorPoLineInput[];
}

export interface ReceiptInput {
  receivedDate: string;
  receivedNotes?: string | null;
}
