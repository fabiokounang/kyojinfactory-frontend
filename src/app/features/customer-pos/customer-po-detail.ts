import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

import { CustomerPoService } from '../../core/services/customer-po.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerPo, PoLine, PoStatus } from '../../core/models/customer-po.model';
import { lineTaxBreakdown } from '../../core/utils/ppn.util';
import { formatTableDate, formatTableDateTime } from '../../core/utils/date.util';

@Component({
  selector: 'app-customer-po-detail',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDividerModule,
  ],
  templateUrl: './customer-po-detail.html',
  styleUrl: './customer-po-detail.scss',
})
export class CustomerPoDetailComponent {
  private readonly poService = inject(CustomerPoService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly po = signal<CustomerPo | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly busy = signal(false);

  receiptDate = '';
  receiptNotes = '';
  receiptMarkCompleted = true;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly emptyText = '-';

  readonly formatDate = formatTableDate;
  readonly formatDateTime = formatTableDateTime;

  readonly lineColumns = ['lineNo', 'itemName', 'itemCode', 'stdSize', 'qty', 'unit', 'unitPrice', 'ppn', 'lineAmount'];

  readonly canEdit = computed(() => this.auth.isSuperAdmin() && this.po()?.status === 'DRAFT');
  readonly canDelete = computed(() => this.auth.isSuperAdmin() && this.po()?.status === 'DRAFT');
  readonly canConfirm = computed(() => this.po()?.status === 'DRAFT');
  readonly canCancel = computed(() => {
    const s = this.po()?.status;
    return s === 'DRAFT' || s === 'CONFIRMED' || s === 'IN_PRODUCTION';
  });

  readonly showReceiptCard = computed(() => {
    const po = this.po();
    if (!po) return false;
    return (
      po.paymentTermTrigger === 'AFTER_GOODS_RECEIVED' &&
      po.status !== 'DRAFT' &&
      po.status !== 'CANCELLED'
    );
  });

  readonly total = computed(() => {
    const po = this.po();
    if (!po) return 0;
    return po.lines.reduce((sum, l) => sum + l.lineAmount, 0);
  });

  readonly totalDpp = computed(() => {
    const po = this.po();
    if (!po) return 0;
    return po.lines.reduce((sum, l) => sum + this.lineBreakdown(l, po.ppnRate).dpp, 0);
  });

  readonly totalPpn = computed(() => {
    const po = this.po();
    if (!po) return 0;
    return po.lines.reduce((sum, l) => sum + this.lineBreakdown(l, po.ppnRate).ppn, 0);
  });

  lineBreakdown(line: PoLine, ppnRate: number) {
    return lineTaxBreakdown(line.qty, line.unitPrice, line.ppnIncluded, ppnRate);
  }

  ppnLabel(line: PoLine, ppnRate: number): string {
    return line.ppnIncluded ? `Include ${ppnRate}%` : `Exclude +${ppnRate}%`;
  }

  statusLabel(status: PoStatus): string {
    const labels: Record<PoStatus, string> = {
      DRAFT: 'Draft',
      CONFIRMED: 'Dikonfirmasi',
      IN_PRODUCTION: 'Produksi',
      COMPLETED: 'Selesai',
      CANCELLED: 'Dibatalkan',
    };
    return labels[status] ?? status;
  }

  paymentTermLabel(po: CustomerPo): string {
    const trigger =
      po.paymentTermTrigger === 'AFTER_PO_ISSUED'
        ? 'tanggal PO terbit'
        : 'tanggal customer terima barang';
    return `${po.paymentTermDays} hari sejak ${trigger}`;
  }

  constructor() {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.poService.get(id).subscribe({
      next: (po) => {
        this.po.set(po);
        this.receiptDate = po.customerReceivedAt ?? '';
        this.receiptNotes = po.customerReceivedNotes ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('PO tidak ditemukan');
        this.loading.set(false);
      },
    });
  }

  confirm(): void {
    if (!this.po() || !this.canConfirm()) return;
    if (
      !confirm(
        'Konfirmasi PO?\n\nMaster Item FG dan todo BOM akan dibuat. Aksi ini tidak dapat dikembalikan ke DRAFT.'
      )
    )
      return;

    this.busy.set(true);
    this.poService.confirm(this.po()!.id).subscribe({
      next: (updated) => {
        this.po.set(updated);
        this.busy.set(false);
        this.snackBar.open('PO berhasil dikonfirmasi', 'OK', { duration: 4000 });
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.snackBar.open(err.error?.message || 'Gagal mengkonfirmasi', 'Tutup', { duration: 5000 });
      },
    });
  }

  cancelPo(): void {
    if (!this.po() || !this.canCancel()) return;
    if (!confirm('Batalkan PO ini?')) return;
    this.busy.set(true);
    this.poService.cancel(this.po()!.id).subscribe({
      next: (updated) => {
        this.po.set(updated);
        this.busy.set(false);
        this.snackBar.open('PO dibatalkan', 'OK', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.snackBar.open(err.error?.message || 'Gagal membatalkan', 'Tutup', { duration: 5000 });
      },
    });
  }

  saveReceipt(): void {
    if (!this.receiptDate) {
      this.snackBar.open('Tanggal penerimaan wajib diisi', 'Tutup', { duration: 4000 });
      return;
    }
    this.busy.set(true);
    this.poService
      .recordReceipt(this.po()!.id, {
        receivedDate: this.receiptDate,
        notes: this.receiptNotes || null,
        markCompleted: this.receiptMarkCompleted,
      })
      .subscribe({
        next: (updated) => {
          this.po.set(updated);
          this.busy.set(false);
          this.snackBar.open('Penerimaan berhasil dicatat', 'OK', { duration: 4000 });
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.snackBar.open(err.error?.message || 'Gagal menyimpan penerimaan', 'Tutup', { duration: 5000 });
        },
      });
  }

  goEdit(): void {
    if (this.po()) this.router.navigate(['/customer-pos', this.po()!.id, 'edit']);
  }

  deletePo(): void {
    if (!this.po() || !this.canDelete()) return;
    if (!confirm(`Hapus PO draft "${this.po()!.poNumber}"?`)) return;
    this.busy.set(true);
    this.poService.remove(this.po()!.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open('PO dihapus', 'OK', { duration: 3000 });
        this.router.navigate(['/customer-pos']);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.snackBar.open(err.error?.message || 'Gagal menghapus PO', 'Tutup', { duration: 5000 });
      },
    });
  }
}
