import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { CustomerPoService } from '../../core/services/customer-po.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerPoSummary, PoStatus } from '../../core/models/customer-po.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';

const STATUS_OPTIONS: PoStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
];

@Component({
  selector: 'app-customer-po-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DisplayDatePipe,
  ],
  templateUrl: './customer-po-list.html',
  styleUrl: './customer-po-list.scss',
})
export class CustomerPoListComponent {
  private readonly poService = inject(CustomerPoService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions = STATUS_OPTIONS;
  readonly pos = signal<CustomerPoSummary[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<string>('');
  readonly search = signal('');
  readonly isSuperAdmin = this.auth.isSuperAdmin;

  readonly displayedColumns = [
    'poNumber',
    'poDate',
    'customer',
    'termin',
    'dueDate',
    'status',
    'actions',
  ];

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    this.statusFilter.set(q.get('status') || '');
    this.search.set(q.get('search') || '');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.poService
      .list({
        status: this.statusFilter() || undefined,
        search: this.search() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.pos.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: value || null },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.load();
  }

  canManageDraft(po: CustomerPoSummary): boolean {
    return this.isSuperAdmin() && po.status === 'DRAFT';
  }

  remove(po: CustomerPoSummary): void {
    if (!this.canManageDraft(po)) return;
    if (!confirm(`Hapus PO draft "${po.poNumber}"?`)) return;
    this.poService.remove(po.id).subscribe({
      next: () => {
        this.snackBar.open('PO dihapus', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus PO', 'Tutup', { duration: 5000 });
      },
    });
  }
}
