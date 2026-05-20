import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Pof,
  PofSummary,
  PofInput,
  EligibleCustomerPo,
  PrefillData,
  UserAssignee,
} from '../models/pof.model';

@Injectable({ providedIn: 'root' })
export class PofService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/prod-order-forms`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  list(opts: { status?: string; search?: string } = {}): Observable<PofSummary[]> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<{ data: PofSummary[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<Pof> {
    return this.http.get<{ data: Pof }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  eligibleCustomerPos(): Observable<EligibleCustomerPo[]> {
    return this.http
      .get<{ data: EligibleCustomerPo[] }>(`${this.url}/eligible-customer-pos`)
      .pipe(map((r) => r.data));
  }

  prefill(customerPoId: number): Observable<PrefillData> {
    return this.http
      .get<{ data: PrefillData }>(`${this.url}/prefill/${customerPoId}`)
      .pipe(map((r) => r.data));
  }

  create(input: PofInput): Observable<Pof> {
    return this.http.post<{ data: Pof }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: Omit<PofInput, 'customerPoId'>): Observable<Pof> {
    return this.http.put<{ data: Pof }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  release(id: number): Observable<Pof> {
    return this.http.post<{ data: Pof }>(`${this.url}/${id}/release`, {}).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<Pof> {
    return this.http.post<{ data: Pof }>(`${this.url}/${id}/cancel`, {}).pipe(map((r) => r.data));
  }

  assignees(): Observable<UserAssignee[]> {
    return this.http
      .get<{ data: UserAssignee[] }>(`${this.usersUrl}/assignees`)
      .pipe(map((r) => r.data));
  }
}
