import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Vendor, VendorInput } from '../models/vendor.model';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/vendors`;

  list(opts: { search?: string; includeInactive?: boolean } = {}): Observable<Vendor[]> {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<{ data: Vendor[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<Vendor> {
    return this.http.get<{ data: Vendor }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  create(input: VendorInput): Observable<Vendor> {
    return this.http.post<{ data: Vendor }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: VendorInput): Observable<Vendor> {
    return this.http.put<{ data: Vendor }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
