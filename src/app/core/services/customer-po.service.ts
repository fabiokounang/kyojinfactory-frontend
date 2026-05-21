import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CustomerPo,
  CustomerPoInput,
  CustomerPoSummary,
  RecordReceiptInput,
} from '../models/customer-po.model';


@Injectable({ providedIn: 'root' })
export class CustomerPoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/customer-pos`;

  list(opts: { status?: string; customerId?: number; search?: string } = {}): Observable<CustomerPoSummary[]> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.customerId) params = params.set('customerId', String(opts.customerId));
    if (opts.search) params = params.set('search', opts.search);
    return this.http
      .get<{ data: CustomerPoSummary[] }>(this.url, { params })
      .pipe(map((r) => r.data));
  }

  get(id: number): Observable<CustomerPo> {
    return this.http.get<{ data: CustomerPo }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  create(input: CustomerPoInput): Observable<CustomerPo> {
    return this.http.post<{ data: CustomerPo }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: CustomerPoInput): Observable<CustomerPo> {
    return this.http.put<{ data: CustomerPo }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  confirm(id: number): Observable<CustomerPo> {
    return this.http
      .post<{ data: CustomerPo }>(`${this.url}/${id}/confirm`, {})
      .pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<CustomerPo> {
    return this.http
      .post<{ data: CustomerPo }>(`${this.url}/${id}/cancel`, {})
      .pipe(map((r) => r.data));
  }

  recordReceipt(id: number, input: RecordReceiptInput): Observable<CustomerPo> {
    return this.http
      .post<{ data: CustomerPo }>(`${this.url}/${id}/record-receipt`, input)
      .pipe(map((r) => r.data));
  }

  markTermPaid(poId: number, termId: number, paidAt: string | null): Observable<CustomerPo> {
    return this.http
      .patch<{ data: CustomerPo }>(`${this.url}/${poId}/terms/${termId}/paid`, { paidAt })
      .pipe(map((r) => r.data));
  }

  previewCode(name: string): Observable<string | null> {
    const params = new HttpParams().set('name', name);
    return this.http
      .get<{ data: { code: string | null } }>(`${this.url}/preview-code`, { params })
      .pipe(map((r) => r.data.code));
  }
}
