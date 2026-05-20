import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/services/auth.service';
import { CustomerPoService } from '../../core/services/customer-po.service';
import { TaskService } from '../../core/services/task.service';
import { CustomerPoSummary } from '../../core/models/customer-po.model';
import { Task } from '../../core/models/task.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    DisplayDatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly poService = inject(CustomerPoService);
  private readonly taskService = inject(TaskService);

  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly recentPos = signal<CustomerPoSummary[]>([]);
  readonly openTasks = signal<Task[]>([]);
  readonly stats = signal({ draft: 0, confirmed: 0, openTodos: 0, awaitingReceipt: 0 });

  private static readonly STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    CONFIRMED: 'Dikonfirmasi',
    IN_PRODUCTION: 'Produksi',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };

  poStatusLabel(status: string): string {
    return DashboardComponent.STATUS_LABELS[status] ?? status;
  }

  constructor() {
    forkJoin({
      pos: this.poService.list(),
      tasks: this.taskService.list('OPEN'),
    }).subscribe({
      next: ({ pos, tasks }) => {
        this.recentPos.set(pos.slice(0, 5));
        this.openTasks.set(tasks.slice(0, 5));
        this.stats.set({
          draft: pos.filter((p) => p.status === 'DRAFT').length,
          confirmed: pos.filter((p) => p.status === 'CONFIRMED').length,
          openTodos: tasks.length,
          awaitingReceipt: pos.filter(
            (p) =>
              p.paymentTermTrigger === 'AFTER_GOODS_RECEIVED' &&
              !p.customerReceivedAt &&
              p.status !== 'DRAFT' &&
              p.status !== 'CANCELLED'
          ).length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
