import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  VendorInvoice,
  VendorInvoiceInput,
  VendorInvoicePrefill,
  EligibleVendorPoForInvoice,
} from '../models/vendor-invoice.model';

@Injectable({ providedIn: 'root' })
export class VendorInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/vendor-invoices`;

  list(opts: { status?: string; vendorPoId?: number; search?: string } = {}): Observable<VendorInvoice[]> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.vendorPoId) params = params.set('vendorPoId', String(opts.vendorPoId));
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{ data: VendorInvoice[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<VendorInvoice> {
    return this.http.get<{ data: VendorInvoice }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  eligiblePos(): Observable<EligibleVendorPoForInvoice[]> {
    return this.http
      .get<{ data: EligibleVendorPoForInvoice[] }>(`${this.url}/eligible-vendor-pos`)
      .pipe(map((r) => r.data));
  }

  prefill(vendorPoId: number, paymentTermId?: number | null): Observable<VendorInvoicePrefill> {
    let params = new HttpParams();
    if (paymentTermId) params = params.set('paymentTermId', String(paymentTermId));
    return this.http
      .get<{ data: VendorInvoicePrefill }>(`${this.url}/prefill/${vendorPoId}`, { params })
      .pipe(map((r) => r.data));
  }

  create(input: VendorInvoiceInput): Observable<VendorInvoice> {
    return this.http.post<{ data: VendorInvoice }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: Partial<VendorInvoiceInput>): Observable<VendorInvoice> {
    return this.http.put<{ data: VendorInvoice }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  verify(id: number): Observable<VendorInvoice> {
    return this.http.post<{ data: VendorInvoice }>(`${this.url}/${id}/verify`, {}).pipe(map((r) => r.data));
  }

  markPaid(id: number, paidAt?: string | null): Observable<VendorInvoice> {
    return this.http
      .post<{ data: VendorInvoice }>(`${this.url}/${id}/paid`, { paidAt: paidAt ?? null })
      .pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<VendorInvoice> {
    return this.http.post<{ data: VendorInvoice }>(`${this.url}/${id}/cancel`, {}).pipe(map((r) => r.data));
  }
}
