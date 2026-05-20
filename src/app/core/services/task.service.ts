import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Task, TaskStatus } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tasks`;

  list(status?: TaskStatus): Observable<Task[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ data: Task[] }>(this.url, { params }).pipe(map((r) => r.data));
  }

  markDone(id: number): Observable<Task> {
    return this.http
      .patch<{ data: Task }>(`${this.url}/${id}/done`, {})
      .pipe(map((r) => r.data));
  }

  reopen(id: number): Observable<Task> {
    return this.http
      .patch<{ data: Task }>(`${this.url}/${id}/reopen`, {})
      .pipe(map((r) => r.data));
  }
}
