export type CustomerInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface CustomerInvoice {
  id: number;
  invoiceNumber: string;
  customerPoId: number;
  poNumber: string;
  cpoStatus: string;
  customerPoPaymentTermId: number | null;
  termLabel: string | null;
  termNo: number | null;
  customer: { id: number; code: string; name: string };
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  ppnAmount: number;
  total: number;
  ppnRate: number;
  status: CustomerInvoiceStatus;
  statusLabel: string;
  paidAt: string | null;
  notes: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleCustomerPoForInvoice {
  id: number;
  poNumber: string;
  poDate: string;
  status: string;
  poTotal: number;
  customer: { id: number; code: string; name: string };
}

export interface InvoicePaymentTermOption {
  id: number;
  termNo: number;
  label: string | null;
  amountType: string;
  amountValue: number;
  termDays: number;
  dueDate: string | null;
  paidAt: string | null;
  suggestedAmount: number;
}

export interface CustomerInvoicePrefill {
  po: {
    id: number;
    poNumber: string;
    poDate: string;
    status: string;
    ppnRate: number;
    customer: { id: number; code: string; name: string };
    grandTotal: number;
  };
  paymentTerms: InvoicePaymentTermOption[];
  suggested: {
    customerPoPaymentTermId: number | null;
    dueDate: string | null;
    subtotal: number;
    ppnAmount: number;
    total: number;
  };
}

export interface CustomerInvoiceInput {
  customerPoId: number;
  customerPoPaymentTermId?: number | null;
  invoiceDate: string;
  dueDate?: string | null;
  total?: number;
  notes?: string | null;
}
