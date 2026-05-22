import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DecimalPipe } from '@angular/common';

import { VendorInvoiceService } from '../../core/services/vendor-invoice.service';
import {
  VendorInvoice,
  VendorInvoicePrefill,
  EligibleVendorPoForInvoice,
} from '../../core/models/vendor-invoice.model';

@Component({
  selector: 'app-vendor-invoice-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, DecimalPipe,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './vendor-invoice-form.html',
  styleUrl: '../customer-invoices/invoice-form.scss',
})
export class VendorInvoiceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(VendorInvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly eligiblePos = signal<EligibleVendorPoForInvoice[]>([]);
  readonly prefill = signal<VendorInvoicePrefill | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);

  readonly form = this.fb.group({
    vendorPoId: [null as number | null, Validators.required],
    vendorInvoiceNumber: [''],
    vendorPoPaymentTermId: [null as number | null],
    receivedDate: [new Date().toISOString().slice(0, 10)],
    invoiceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    dueDate: [''],
    total: [0, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) this.editingId.set(Number(idParam));

    this.svc.eligiblePos().subscribe({
      next: (pos) => {
        this.eligiblePos.set(pos);
        if (this.isEditMode()) {
          this.svc.get(this.editingId()!).subscribe({
            next: (inv) => this.patchForEdit(inv, pos),
            error: () => { this.errorMessage.set('Gagal memuat faktur'); this.loading.set(false); },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => { this.errorMessage.set('Gagal memuat data PO'); this.loading.set(false); },
    });
  }

  calcDpp(): number {
    const total = Number(this.form.controls.total.value) || 0;
    const rate = this.prefill()?.po.ppnRate ?? 11;
    return Number((total / (1 + rate / 100)).toFixed(0));
  }

  calcPpn(): number {
    const total = Number(this.form.controls.total.value) || 0;
    return total - this.calcDpp();
  }

  private patchForEdit(inv: VendorInvoice, pos: EligibleVendorPoForInvoice[]): void {
    if (!pos.some((p) => p.id === inv.vendorPoId)) {
      this.eligiblePos.update((list) => [{
        id: inv.vendorPoId, poNumber: inv.poNumber, poDate: inv.invoiceDate,
        status: inv.vpoStatus, poTotal: inv.total, vendor: inv.vendor,
      }, ...list]);
    }
    this.form.patchValue({
      vendorPoId: inv.vendorPoId,
      vendorInvoiceNumber: inv.vendorInvoiceNumber ?? '',
      vendorPoPaymentTermId: inv.vendorPoPaymentTermId,
      receivedDate: inv.receivedDate ?? inv.invoiceDate,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate ?? '',
      total: inv.total,
      notes: inv.notes ?? '',
    });
    this.form.controls.vendorPoId.disable();
    this.loadPrefill(inv.vendorPoId, inv.vendorPoPaymentTermId);
    this.loading.set(false);
  }

  onPoChange(poId: number | null): void {
    if (!poId) return;
    this.loadPrefill(poId, this.form.controls.vendorPoPaymentTermId.value);
  }

  onTermChange(termId: number | null): void {
    const poId = this.form.controls.vendorPoId.value;
    if (!poId) return;
    this.loadPrefill(poId, termId);
  }

  private loadPrefill(poId: number, termId: number | null): void {
    this.svc.prefill(poId, termId).subscribe({
      next: (data) => {
        this.prefill.set(data);
        if (!this.isEditMode()) {
          this.form.patchValue({
            total: data.suggested.total,
            dueDate: data.suggested.dueDate ?? '',
            vendorPoPaymentTermId: termId ?? data.suggested.vendorPoPaymentTermId,
          });
        }
      },
      error: () => this.snackBar.open('Gagal memuat data PO', 'Tutup', { duration: 4000 }),
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      vendorPoId: raw.vendorPoId!,
      vendorInvoiceNumber: raw.vendorInvoiceNumber || null,
      vendorPoPaymentTermId: raw.vendorPoPaymentTermId,
      receivedDate: raw.receivedDate || null,
      invoiceDate: raw.invoiceDate!,
      dueDate: raw.dueDate || null,
      total: Number(raw.total),
      notes: raw.notes || null,
    };
    const req$ = this.isEditMode()
      ? this.svc.update(this.editingId()!, payload)
      : this.svc.create(payload);
    req$.subscribe({
      next: (inv) => {
        this.snackBar.open('Faktur disimpan', 'OK', { duration: 3000 });
        this.router.navigate(['/vendor-invoices', inv.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Gagal menyimpan');
        this.saving.set(false);
      },
    });
  }
}
