import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CustomerInvoice,
  CustomerInvoiceInput,
  CustomerInvoicePrefill,
  EligibleCustomerPoForInvoice,
} from '../models/customer-invoice.model';

@Injectable({ providedIn: 'root' })
export class CustomerInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/customer-invoices`;

  list(opts: { status?: string; customerPoId?: number; search?: string } = {}): Observable<CustomerInvoice[]> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.customerPoId) params = params.set('customerPoId', String(opts.customerPoId));
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{ data: CustomerInvoice[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<CustomerInvoice> {
    return this.http.get<{ data: CustomerInvoice }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  eligiblePos(): Observable<EligibleCustomerPoForInvoice[]> {
    return this.http
      .get<{ data: EligibleCustomerPoForInvoice[] }>(`${this.url}/eligible-customer-pos`)
      .pipe(map((r) => r.data));
  }

  prefill(customerPoId: number, paymentTermId?: number | null): Observable<CustomerInvoicePrefill> {
    let params = new HttpParams();
    if (paymentTermId) params = params.set('paymentTermId', String(paymentTermId));
    return this.http
      .get<{ data: CustomerInvoicePrefill }>(`${this.url}/prefill/${customerPoId}`, { params })
      .pipe(map((r) => r.data));
  }

  create(input: CustomerInvoiceInput): Observable<CustomerInvoice> {
    return this.http.post<{ data: CustomerInvoice }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: Partial<CustomerInvoiceInput>): Observable<CustomerInvoice> {
    return this.http.put<{ data: CustomerInvoice }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  issue(id: number): Observable<CustomerInvoice> {
    return this.http.post<{ data: CustomerInvoice }>(`${this.url}/${id}/issue`, {}).pipe(map((r) => r.data));
  }

  markPaid(id: number, paidAt?: string | null): Observable<CustomerInvoice> {
    return this.http
      .post<{ data: CustomerInvoice }>(`${this.url}/${id}/paid`, { paidAt: paidAt ?? null })
      .pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<CustomerInvoice> {
    return this.http.post<{ data: CustomerInvoice }>(`${this.url}/${id}/cancel`, {}).pipe(map((r) => r.data));
  }
}
