import { Component, computed, inject, signal } from '@angular/core';
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
import { MatTableModule } from '@angular/material/table';

import { VendorPoService } from '../../core/services/vendor-po.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentTerm, VendorPo } from '../../core/models/vendor-po.model';

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
    MatTableModule,
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
  private readonly auth = inject(AuthService);

  readonly vpo = signal<VendorPo | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly showReceiveForm = signal(false);

  readonly receiveForm = this.fb.nonNullable.group({
    receivedDate:  ['', Validators.required],
    receivedNotes: [''],
  });

  readonly termColumns = ['termNo', 'label', 'amount', 'termDays', 'dueDate', 'status', 'actions'];
  readonly hasTerms = computed(() => (this.vpo()?.paymentTerms?.length ?? 0) > 0);
  readonly canEdit = computed(() => {
    const s = this.vpo()?.status;
    return this.auth.isSuperAdmin() && (s === 'CONFIRMED' || s === 'DRAFT');
  });
  readonly canDelete = computed(() => this.auth.isSuperAdmin() && this.vpo()?.status === 'DRAFT');
  readonly canConfirm = computed(() => this.vpo()?.status === 'DRAFT');
  readonly grandTotalAmount = computed(() => {
    const v = this.vpo();
    if (!v) return 0;
    return v.lines.reduce((sum, l) => sum + l.lineAmount, 0);
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

  paymentTermLabel(v: VendorPo): string {
    const trigger =
      v.paymentTermTrigger === 'AFTER_PO_ISSUED'
        ? 'tanggal PO terbit'
        : 'tanggal barang diterima';
    const count = v.paymentTerms?.length ?? 0;
    return count > 0
      ? `${count} termin sejak ${trigger}`
      : `${v.paymentTermDays} hari sejak ${trigger}`;
  }

  termAmountLabel(t: PaymentTerm, total: number): string {
    if (t.amountType === 'PERCENT') {
      const rp = total * (t.amountValue / 100);
      return `${t.amountValue}% ≈ Rp ${rp.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
    }
    return `Rp ${Number(t.amountValue).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
  }

  toggleTermPaid(t: PaymentTerm): void {
    const v = this.vpo();
    if (!v) return;
    const today = new Date().toISOString().slice(0, 10);
    const newPaidAt = t.paidAt ? null : today;
    this.busy.set(true);
    this.vpoService.markTermPaid(v.id, t.id, newPaidAt).subscribe({
      next: (updated) => {
        this.vpo.set(updated);
        this.busy.set(false);
        this.snackBar.open(
          newPaidAt ? 'Termin ditandai lunas' : 'Tandai lunas dibatalkan',
          'OK',
          { duration: 3000 }
        );
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.snackBar.open(err.error?.message || 'Gagal', 'Tutup', { duration: 4000 });
      },
    });
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
