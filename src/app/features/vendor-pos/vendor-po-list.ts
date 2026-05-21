import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, LowerCasePipe } from '@angular/common';

import { VendorPoService } from '../../core/services/vendor-po.service';
import { AuthService } from '../../core/services/auth.service';
import { VendorPo, VendorPoStatus } from '../../core/models/vendor-po.model';

const STATUS_OPTS: { label: string; value: string }[] = [
  { label: 'Semua Status', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Dikonfirmasi', value: 'CONFIRMED' },
  { label: 'Barang Diterima', value: 'RECEIVED' },
  { label: 'Selesai', value: 'COMPLETED' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

@Component({
  selector: 'app-vendor-po-list',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    LowerCasePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './vendor-po-list.html',
  styleUrl: './vendor-po-list.scss',
})
export class VendorPoListComponent {
  private readonly vpoService = inject(VendorPoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly statusOpts = STATUS_OPTS;
  readonly rows = signal<VendorPo[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly filterStatus = signal<string>('');
  readonly displayedColumns = ['poNumber', 'poDate', 'vendor', 'status', 'paymentTerm', 'actions'];

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.vpoService.list({ status: this.filterStatus() || undefined, search: this.search() || undefined }).subscribe({
      next: (data) => { this.rows.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(val: string): void { this.search.set(val); this.load(); }
  onStatusFilter(val: string): void { this.filterStatus.set(val); this.load(); }

  canEditPo(v: VendorPo): boolean {
    return this.auth.isSuperAdmin() && (v.status === 'CONFIRMED' || v.status === 'DRAFT');
  }

  canDeletePo(v: VendorPo): boolean {
    return this.auth.isSuperAdmin() && v.status === 'DRAFT';
  }

  paymentTermLabel(v: VendorPo): string {
    const trigger =
      v.paymentTermTrigger === 'AFTER_PO_ISSUED' ? 'PO terbit' : 'terima barang';
    const n = v.paymentTerms?.length ?? 0;
    return n > 0 ? `${n} termin · ${trigger}` : `${v.paymentTermDays} hari · ${trigger}`;
  }

  deleteDraft(vpo: VendorPo): void {
    if (!confirm(`Hapus PO "${vpo.poNumber}"?`)) return;
    this.vpoService.remove(vpo.id).subscribe({
      next: () => { this.snackBar.open('PO dihapus', 'OK', { duration: 3000 }); this.load(); },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', { duration: 5000 });
      },
    });
  }
}
