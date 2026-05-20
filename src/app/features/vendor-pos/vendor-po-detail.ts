import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VendorPoService } from '../../core/services/vendor-po.service';
import { VendorPo } from '../../core/models/vendor-po.model';

@Component({
  selector: 'app-vendor-po-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    LowerCasePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './vendor-po-detail.html',
  styleUrl: './vendor-po-detail.scss',
})
export class VendorPoDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vpoService = inject(VendorPoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly vpo = signal<VendorPo | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly showReceiveForm = signal(false);

  readonly receiveForm = this.fb.nonNullable.group({
    receivedDate:  ['', Validators.required],
    receivedNotes: [''],
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.vpoService.get(id).subscribe({
      next: (v) => { this.vpo.set(v); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/vendor-pos']); },
    });
  }

  paymentModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      UPFRONT: 'Lunas di muka',
      DP_THEN_RECEIPT: 'DP lalu pelunasan saat terima',
      ON_RECEIPT: 'Bayar penuh saat terima barang',
    };
    return labels[mode] ?? mode;
  }

  lineTotal(unitPrice: number, qty: number, ppnIncluded: boolean): number {
    const net = qty * unitPrice;
    return ppnIncluded ? net : net + net * 0.11;
  }

  grandTotal(): number {
    return (this.vpo()?.lines ?? []).reduce(
      (sum, l) => sum + this.lineTotal(l.unitPrice, l.qty, l.ppnIncluded), 0
    );
  }

  confirm(): void {
    if (!confirm('Konfirmasi PO Vendor ini?')) return;
    this.busy.set(true);
    this.vpoService.confirm(this.vpo()!.id).subscribe({
      next: (v) => { this.vpo.set(v); this.busy.set(false); this.snackBar.open('PO dikonfirmasi', 'OK', { duration: 3000 }); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); },
    });
  }

  submitReceive(): void {
    if (this.receiveForm.invalid || this.busy()) return;
    this.busy.set(true);
    const { receivedDate, receivedNotes } = this.receiveForm.getRawValue();
    this.vpoService.receive(this.vpo()!.id, { receivedDate, receivedNotes: receivedNotes || null }).subscribe({
      next: (v) => {
        this.vpo.set(v);
        this.busy.set(false);
        this.showReceiveForm.set(false);
        this.snackBar.open('Penerimaan barang dicatat', 'OK', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 });
      },
    });
  }

  complete(): void {
    if (!confirm('Tandai PO sebagai Selesai (pembayaran lunas)?')) return;
    this.busy.set(true);
    this.vpoService.complete(this.vpo()!.id).subscribe({
      next: (v) => { this.vpo.set(v); this.busy.set(false); this.snackBar.open('PO selesai', 'OK', { duration: 3000 }); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); },
    });
  }

  cancel(): void {
    if (!confirm('Batalkan PO Vendor ini?')) return;
    this.busy.set(true);
    this.vpoService.cancel(this.vpo()!.id).subscribe({
      next: (v) => { this.vpo.set(v); this.busy.set(false); this.snackBar.open('PO dibatalkan', 'OK', { duration: 3000 }); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); },
    });
  }

  deleteDraft(): void {
    if (!confirm('Hapus PO ini secara permanen?')) return;
    this.busy.set(true);
    this.vpoService.remove(this.vpo()!.id).subscribe({
      next: () => { this.snackBar.open('PO dihapus', 'OK', { duration: 3000 }); this.router.navigate(['/vendor-pos']); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 5000 }); },
    });
  }
}
