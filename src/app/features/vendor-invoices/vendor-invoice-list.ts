import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';

import { VendorInvoiceService } from '../../core/services/vendor-invoice.service';
import { VendorInvoice } from '../../core/models/vendor-invoice.model';

const STATUS_OPTS = [
  { label: 'Semua Status', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Terverifikasi', value: 'VERIFIED' },
  { label: 'Lunas', value: 'PAID' },
  { label: 'Dibatalkan', value: 'CANCELLED' },
];

@Component({
  selector: 'app-vendor-invoice-list',
  standalone: true,
  imports: [
    RouterLink, DatePipe, DecimalPipe, LowerCasePipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './vendor-invoice-list.html',
  styleUrl: '../customer-invoices/invoice-list.scss',
})
export class VendorInvoiceListComponent {
  private readonly svc = inject(VendorInvoiceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly statusOpts = STATUS_OPTS;
  readonly rows = signal<VendorInvoice[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly filterStatus = signal('');
  readonly filterPoId = signal<number | undefined>(undefined);
  readonly displayedColumns = ['invoiceNumber', 'vendorInvoiceNumber', 'invoiceDate', 'vendor', 'poNumber', 'total', 'status', 'actions'];

  constructor() {
    const poId = this.route.snapshot.queryParamMap.get('vendorPoId');
    if (poId) this.filterPoId.set(Number(poId));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({
      status: this.filterStatus() || undefined,
      search: this.search() || undefined,
      vendorPoId: this.filterPoId(),
    }).subscribe({
      next: (data) => { this.rows.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(val: string): void { this.search.set(val); this.load(); }
  onStatusFilter(val: string): void { this.filterStatus.set(val); this.load(); }

  deleteDraft(inv: VendorInvoice): void {
    if (!confirm(`Hapus faktur "${inv.invoiceNumber}"?`)) return;
    this.svc.remove(inv.id).subscribe({
      next: () => { this.snackBar.open('Faktur dihapus', 'OK', { duration: 3000 }); this.load(); },
      error: (err: HttpErrorResponse) => this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }),
    });
  }
}
