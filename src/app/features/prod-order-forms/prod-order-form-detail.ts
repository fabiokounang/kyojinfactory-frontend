import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { PofService } from '../../core/services/pof.service';
import { Pof } from '../../core/models/pof.model';
import { DisplayDatePipe } from '../../core/pipes/display-date.pipe';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  RELEASED: 'Released',
  CANCELLED: 'Dibatalkan',
};

@Component({
  selector: 'app-prod-order-form-detail',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    DisplayDatePipe,
  ],
  templateUrl: './prod-order-form-detail.html',
  styleUrl: './prod-order-form-detail.scss',
})
export class ProdOrderFormDetailComponent {
  private readonly pofService = inject(PofService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly pof = signal<Pof | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly lineColumns = ['lineNo', 'productNumber', 'itemName', 'qtyToProduce', 'bom', 'startDate', 'endDate'];

  readonly canEdit = computed(() => this.pof()?.status === 'DRAFT');
  readonly canRelease = computed(() => this.pof()?.status === 'DRAFT');
  readonly canCancel = computed(() => this.pof()?.status === 'DRAFT');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pofService.get(id).subscribe({
      next: (pof) => {
        this.pof.set(pof);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('POF tidak ditemukan');
        this.loading.set(false);
      },
    });
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  release(): void {
    if (!confirm('Release POF ini? PO Customer akan berstatus IN_PRODUCTION.')) return;
    this.busy.set(true);
    this.pofService.release(this.pof()!.id).subscribe({
      next: (pof) => {
        this.pof.set(pof);
        this.busy.set(false);
        this.snackBar.open('POF di-release — PO Customer IN_PRODUCTION', 'OK', { duration: 4000 });
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal release', 'Tutup', { duration: 5000 });
        this.busy.set(false);
      },
    });
  }

  cancelPof(): void {
    if (!confirm('Batalkan POF ini?')) return;
    this.busy.set(true);
    this.pofService.cancel(this.pof()!.id).subscribe({
      next: (pof) => {
        this.pof.set(pof);
        this.busy.set(false);
        this.snackBar.open('POF dibatalkan', 'OK', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal membatalkan', 'Tutup', { duration: 5000 });
        this.busy.set(false);
      },
    });
  }

  deletePof(): void {
    if (!confirm('Hapus POF draft ini secara permanen?')) return;
    this.busy.set(true);
    this.pofService.remove(this.pof()!.id).subscribe({
      next: () => {
        this.snackBar.open('POF dihapus', 'OK', { duration: 3000 });
        this.router.navigate(['/prod-order-forms']);
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', { duration: 5000 });
        this.busy.set(false);
      },
    });
  }
}
