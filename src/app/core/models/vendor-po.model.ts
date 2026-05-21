import type {
  PaymentTerm,
  PaymentTermAmountType,
  PaymentTermInput,
  PaymentTermTrigger,
} from './customer-po.model';

export type { PaymentTerm, PaymentTermAmountType, PaymentTermInput, PaymentTermTrigger };

export type VendorPoStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
/** @deprecated legacy header field; use paymentTerms */
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
  paymentTermTrigger: PaymentTermTrigger;
  paymentMode?: PaymentMode;
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
  paymentTerms: PaymentTerm[];
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
  paymentTermTrigger: PaymentTermTrigger;
  notes?: string | null;
  lines: VendorPoLineInput[];
  paymentTerms: PaymentTermInput[];
}

export interface ReceiptInput {
  receivedDate: string;
  receivedNotes?: string | null;
}
