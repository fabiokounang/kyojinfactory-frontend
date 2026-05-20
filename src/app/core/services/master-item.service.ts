import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ItemCategory, MasterItem, MasterItemUpdateInput } from '../models/master-item.model';

@Injectable({ providedIn: 'root' })
export class MasterItemService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/master-items`;

  list(opts: { category?: ItemCategory; search?: string } = {}): Observable<MasterItem[]> {
    let params = new HttpParams();
    if (opts.category) params = params.set('category', opts.category);
    if (opts.search) params = params.set('search', opts.search);
    return this.http
      .get<{ data: MasterItem[] }>(this.url, { params })
      .pipe(map((r) => r.data));
  }

  update(id: number, input: MasterItemUpdateInput): Observable<MasterItem> {
    return this.http
      .put<{ data: MasterItem }>(`${this.url}/${id}`, input)
      .pipe(map((r) => r.data));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
