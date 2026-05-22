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

import { CustomerInvoiceService } from '../../core/services/customer-invoice.service';
import {
  CustomerInvoice,
  CustomerInvoicePrefill,
  EligibleCustomerPoForInvoice,
} from '../../core/models/customer-invoice.model';

@Component({
  selector: 'app-customer-invoice-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, DecimalPipe,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './customer-invoice-form.html',
  styleUrl: './invoice-form.scss',
})
export class CustomerInvoiceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CustomerInvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly eligiblePos = signal<EligibleCustomerPoForInvoice[]>([]);
  readonly prefill = signal<CustomerInvoicePrefill | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);

  readonly form = this.fb.group({
    customerPoId: [null as number | null, Validators.required],
    customerPoPaymentTermId: [null as number | null],
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

  private patchForEdit(inv: CustomerInvoice, pos: EligibleCustomerPoForInvoice[]): void {
    if (!pos.some((p) => p.id === inv.customerPoId)) {
      this.eligiblePos.update((list) => [{
        id: inv.customerPoId, poNumber: inv.poNumber, poDate: inv.invoiceDate,
        status: inv.cpoStatus, poTotal: inv.total, customer: inv.customer,
      }, ...list]);
    }
    this.form.patchValue({
      customerPoId: inv.customerPoId,
      customerPoPaymentTermId: inv.customerPoPaymentTermId,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate ?? '',
      total: inv.total,
      notes: inv.notes ?? '',
    });
    this.form.controls.customerPoId.disable();
    this.loadPrefill(inv.customerPoId, inv.customerPoPaymentTermId);
    this.loading.set(false);
  }

  onPoChange(poId: number | null): void {
    if (!poId) return;
    this.loadPrefill(poId, this.form.controls.customerPoPaymentTermId.value);
  }

  onTermChange(termId: number | null): void {
    const poId = this.form.controls.customerPoId.value;
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
            customerPoPaymentTermId: termId ?? data.suggested.customerPoPaymentTermId,
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
      customerPoId: raw.customerPoId!,
      customerPoPaymentTermId: raw.customerPoPaymentTermId,
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
        this.router.navigate(['/customer-invoices', inv.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Gagal menyimpan');
        this.saving.set(false);
      },
    });
  }
}
