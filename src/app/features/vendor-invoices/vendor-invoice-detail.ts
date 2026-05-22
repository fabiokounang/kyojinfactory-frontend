import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { VendorInvoiceService } from '../../core/services/vendor-invoice.service';
import { VendorInvoice } from '../../core/models/vendor-invoice.model';

@Component({
  selector: 'app-vendor-invoice-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, DecimalPipe, LowerCasePipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './vendor-invoice-detail.html',
  styleUrl: '../customer-invoices/customer-invoice-detail.scss',
})
export class VendorInvoiceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(VendorInvoiceService);
  private readonly snackBar = inject(MatSnackBar);

  readonly inv = signal<VendorInvoice | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.get(id).subscribe({
      next: (data) => { this.inv.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Faktur tidak ditemukan', 'Tutup', { duration: 4000 }); },
    });
  }

  reload(id: number): void {
    this.svc.get(id).subscribe({ next: (data) => this.inv.set(data) });
  }

  verify(): void {
    const i = this.inv(); if (!i) return;
    this.busy.set(true);
    this.svc.verify(i.id).subscribe({
      next: () => { this.snackBar.open('Faktur diverifikasi', 'OK', { duration: 3000 }); this.reload(i.id); this.busy.set(false); },
      error: (err: HttpErrorResponse) => { this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); this.busy.set(false); },
    });
  }

  markPaid(): void {
    const i = this.inv(); if (!i) return;
    this.busy.set(true);
    this.svc.markPaid(i.id).subscribe({
      next: () => { this.snackBar.open('Faktur lunas', 'OK', { duration: 3000 }); this.reload(i.id); this.busy.set(false); },
      error: (err: HttpErrorResponse) => { this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); this.busy.set(false); },
    });
  }

  cancel(): void {
    const i = this.inv(); if (!i || !confirm('Batalkan faktur ini?')) return;
    this.busy.set(true);
    this.svc.cancel(i.id).subscribe({
      next: () => { this.snackBar.open('Faktur dibatalkan', 'OK', { duration: 3000 }); this.reload(i.id); this.busy.set(false); },
      error: (err: HttpErrorResponse) => { this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); this.busy.set(false); },
    });
  }

  deleteInv(): void {
    const i = this.inv(); if (!i || !confirm('Hapus faktur draft ini?')) return;
    this.svc.remove(i.id).subscribe({
      next: () => { this.snackBar.open('Faktur dihapus', 'OK', { duration: 3000 }); this.router.navigate(['/vendor-invoices']); },
      error: (err: HttpErrorResponse) => this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }),
    });
  }
}
