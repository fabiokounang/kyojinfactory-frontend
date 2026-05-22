export type VendorInvoiceStatus = 'DRAFT' | 'VERIFIED' | 'PAID' | 'CANCELLED';

export interface VendorInvoice {
  id: number;
  invoiceNumber: string;
  vendorPoId: number;
  poNumber: string;
  vpoStatus: string;
  vendorInvoiceNumber: string | null;
  vendorPoPaymentTermId: number | null;
  termLabel: string | null;
  termNo: number | null;
  vendor: { id: number; code: string; name: string };
  receivedDate: string | null;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  ppnAmount: number;
  total: number;
  ppnRate: number;
  status: VendorInvoiceStatus;
  statusLabel: string;
  paidAt: string | null;
  notes: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleVendorPoForInvoice {
  id: number;
  poNumber: string;
  poDate: string;
  status: string;
  poTotal: number;
  vendor: { id: number; code: string; name: string };
}

export interface VendorInvoicePrefill {
  po: {
    id: number;
    poNumber: string;
    poDate: string;
    status: string;
    ppnRate: number;
    vendor: { id: number; code: string; name: string };
    grandTotal: number;
  };
  paymentTerms: {
    id: number;
    termNo: number;
    label: string | null;
    amountType: string;
    amountValue: number;
    termDays: number;
    dueDate: string | null;
    paidAt: string | null;
    suggestedAmount: number;
  }[];
  suggested: {
    vendorPoPaymentTermId: number | null;
    dueDate: string | null;
    subtotal: number;
    ppnAmount: number;
    total: number;
  };
}

export interface VendorInvoiceInput {
  vendorPoId: number;
  vendorInvoiceNumber?: string | null;
  vendorPoPaymentTermId?: number | null;
  receivedDate?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  total?: number;
  notes?: string | null;
}
