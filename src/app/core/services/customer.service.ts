import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer, CustomerInput } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/customers`;

  list(opts: { search?: string; includeInactive?: boolean } = {}): Observable<Customer[]> {
    let params = new HttpParams();
    if (opts.search) params = params.set('search', opts.search);
    if (opts.includeInactive) params = params.set('includeInactive', 'true');
    return this.http
      .get<{ data: Customer[] }>(this.url, { params })
      .pipe(map((r) => r.data));
  }

  get(id: number): Observable<Customer> {
    return this.http.get<{ data: Customer }>(`${this.url}/${id}`).pipe(map((r) => r.data));
  }

  create(input: CustomerInput): Observable<Customer> {
    return this.http.post<{ data: Customer }>(this.url, input).pipe(map((r) => r.data));
  }

  update(id: number, input: CustomerInput): Observable<Customer> {
    return this.http.put<{ data: Customer }>(`${this.url}/${id}`, input).pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
