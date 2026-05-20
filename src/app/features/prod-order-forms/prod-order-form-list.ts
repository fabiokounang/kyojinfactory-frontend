import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PofService } from '../../core/services/pof.service';
import { AuthService } from '../../core/services/auth.service';
import { PofSummary, PofStatus } from '../../core/models/pof.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';

const STATUS_OPTIONS: PofStatus[] = ['DRAFT', 'RELEASED', 'CANCELLED'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  RELEASED: 'Released',
  CANCELLED: 'Dibatalkan',
};

@Component({
  selector: 'app-prod-order-form-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DisplayDatePipe,
  ],
  templateUrl: './prod-order-form-list.html',
  styleUrl: './prod-order-form-list.scss',
})
export class ProdOrderFormListComponent {
  private readonly pofService = inject(PofService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions = STATUS_OPTIONS;
  readonly pofs = signal<PofSummary[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<string>('');
  readonly search = signal('');

  readonly displayedColumns = ['pofNumber', 'poNumber', 'customer', 'supervisor', 'status', 'releasedAt', 'actions'];

  readonly statusLabels = STATUS_LABELS;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.pofService
      .list({ status: this.statusFilter() || undefined, search: this.search() || undefined })
      .subscribe({
        next: (data) => {
          this.pofs.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  canDelete(pof: PofSummary): boolean {
    return pof.status === 'DRAFT';
  }

  remove(pof: PofSummary): void {
    if (!confirm(`Hapus POF draft "${pof.pofNumber}"?`)) return;
    this.pofService.remove(pof.id).subscribe({
      next: () => {
        this.snackBar.open('POF dihapus', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', { duration: 5000 });
      },
    });
  }
}
