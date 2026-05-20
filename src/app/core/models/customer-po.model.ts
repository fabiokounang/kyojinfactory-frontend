export type PoStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
export type PaymentTermTrigger = 'AFTER_PO_ISSUED' | 'AFTER_GOODS_RECEIVED';

export interface PoLine {
  id: number;
  lineNo: number;
  itemName: string;
  itemCode: string | null;
  qty: number;
  unit: string;
  unitPrice: number;
  ppnIncluded: boolean;
  lineAmount: number;
  masterItemId: number | null;
  stdSize: string | null;
}

export interface CustomerPoSummary {
  id: number;
  poNumber: string;
  customerPoRef: string | null;
  poDate: string;
  customer: { id: number; code: string; name: string };
  paymentTermTrigger: PaymentTermTrigger;
  paymentTermDays: number;
  dueDate: string | null;
  ppnRate: number;
  status: PoStatus;
  confirmedAt: string | null;
  customerReceivedAt: string | null;
  createdAt: string;
}

export interface CustomerPo extends CustomerPoSummary {
  notes: string | null;
  createdBy: number | null;
  customerReceivedNotes: string | null;
  customerReceivedBy: number | null;
  updatedAt: string;
  lines: PoLine[];
}

export interface RecordReceiptInput {
  receivedDate: string;
  notes?: string | null;
  markCompleted?: boolean;
}

export interface PoLineInput {
  itemName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  ppnIncluded: boolean;
}

export interface CustomerPoInput {
  customerId: number;
  customerPoRef?: string | null;
  poDate: string;
  paymentTermTrigger: PaymentTermTrigger;
  paymentTermDays: number;
  notes?: string | null;
  lines: PoLineInput[];
}
