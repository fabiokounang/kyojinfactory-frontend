import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BomBulkInput,
  BomComponent,
  BomComponentInput,
  BomDetail,
  BomVersion,
  BomVersionInput,
} from '../models/bom.model';

@Injectable({ providedIn: 'root' })
export class BomService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/bom`;

  listVersions(opts: { fgId?: number; status?: string } = {}): Observable<BomVersion[]> {
    let params = new HttpParams();
    if (opts.fgId) params = params.set('fgId', String(opts.fgId));
    if (opts.status) params = params.set('status', opts.status);
    return this.http
      .get<{ data: BomVersion[] }>(`${this.url}/versions`, { params })
      .pipe(map((r) => r.data));
  }

  getVersion(id: number): Observable<BomDetail> {
    return this.http
      .get<{ data: BomDetail }>(`${this.url}/versions/${id}`)
      .pipe(map((r) => r.data));
  }

  createVersion(input: BomVersionInput): Observable<BomVersion> {
    return this.http
      .post<{ data: BomVersion }>(`${this.url}/versions`, input)
      .pipe(map((r) => r.data));
  }

  /** Buka draft FG yang ada, atau buat draft baru (nama versi otomatis). */
  openOrCreate(fgId: number): Observable<{ version: BomVersion; created: boolean }> {
    return this.http
      .post<{ data: BomVersion; created: boolean }>(`${this.url}/versions/open`, { fgId })
      .pipe(map((r) => ({ version: r.data, created: r.created })));
  }

  deleteVersion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/versions/${id}`);
  }

  activateVersion(id: number): Observable<{ data: BomVersion; tasksClosed: number }> {
    return this.http.post<{ data: BomVersion; tasksClosed: number }>(
      `${this.url}/versions/${id}/activate`,
      {}
    );
  }

  archiveVersion(id: number): Observable<BomVersion> {
    return this.http
      .post<{ data: BomVersion }>(`${this.url}/versions/${id}/archive`, {})
      .pipe(map((r) => r.data));
  }

  addComponents(versionId: number, input: BomBulkInput): Observable<BomDetail> {
    return this.http
      .post<{ data: BomDetail }>(`${this.url}/versions/${versionId}/components`, input)
      .pipe(map((r) => r.data));
  }

  updateComponent(id: number, input: BomComponentInput): Observable<BomComponent> {
    return this.http
      .put<{ data: BomComponent }>(`${this.url}/components/${id}`, input)
      .pipe(map((r) => r.data));
  }

  deleteComponent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/components/${id}`);
  }
}
