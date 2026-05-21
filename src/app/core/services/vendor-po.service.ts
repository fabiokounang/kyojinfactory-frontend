import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VendorPo, VendorPoInput, ReceiptInput } from '../models/vendor-po.model';

@Injectable({ providedIn: 'root' })
export class VendorPoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/vendor-pos`;

  list(opts: { status?: string; vendorId?: number; search?: string } = {}): Observable<VendorPo[]> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.vendorId) params = params.set('vendorId', String(opts.vendorId));
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{ data: VendorPo[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<VendorPo> {
    return this.http.get<{ data: VendorPo }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  create(input: VendorPoInput): Observable<VendorPo> {
    return this.http.post<{ data: VendorPo }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: VendorPoInput): Observable<VendorPo> {
    return this.http.put<{ data: VendorPo }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  confirm(id: number): Observable<VendorPo> {
    return this.http.post<{ data: VendorPo }>(`${this.url}/${id}/confirm`, {}).pipe(map((r) => r.data));
  }

  receive(id: number, input: ReceiptInput): Observable<VendorPo> {
    return this.http.post<{ data: VendorPo }>(`${this.url}/${id}/receive`, input).pipe(map((r) => r.data));
  }

  complete(id: number): Observable<VendorPo> {
    return this.http.post<{ data: VendorPo }>(`${this.url}/${id}/complete`, {}).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<VendorPo> {
    return this.http.post<{ data: VendorPo }>(`${this.url}/${id}/cancel`, {}).pipe(map((r) => r.data));
  }

  markTermPaid(id: number, termId: number, paidAt: string | null): Observable<VendorPo> {
    return this.http
      .patch<{ data: VendorPo }>(`${this.url}/${id}/terms/${termId}/paid`, { paidAt })
      .pipe(map((r) => r.data));
  }
}
