import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppSettings } from '../models/settings.model';
import { DEFAULT_PPN_RATE } from '../utils/ppn.util';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/settings`;

  private readonly _settings = signal<AppSettings>({
    ppnRate: DEFAULT_PPN_RATE,
    defaultPpnRate: DEFAULT_PPN_RATE,
  });

  readonly settings = this._settings.asReadonly();
  readonly ppnRate = () => this._settings().ppnRate;

  load(): Observable<AppSettings> {
    return this.http.get<{ data: AppSettings }>(this.url).pipe(
      map((r) => r.data),
      tap((data) => this._settings.set(data))
    );
  }

  updatePpnRate(ppnRate: number): Observable<AppSettings> {
    return this.http.put<{ data: AppSettings }>(`${this.url}/ppn-rate`, { ppnRate }).pipe(
      map((r) => r.data),
      tap((data) => this._settings.set(data))
    );
  }
}
