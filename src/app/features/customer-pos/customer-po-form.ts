import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CustomerService } from '../../core/services/customer.service';
import { CustomerPoService } from '../../core/services/customer-po.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { Customer } from '../../core/models/customer.model';
import {
  CustomerPoInput,
  PaymentTermInput,
  PaymentTermTrigger,
  PoStatus,
} from '../../core/models/customer-po.model';
import { lineTaxBreakdown } from '../../core/utils/ppn.util';

interface LineForm {
  itemName: FormControl<string>;
  qty: FormControl<number>;
  unit: FormControl<string>;
  unitPrice: FormControl<number>;
  ppnIncluded: FormControl<boolean>;
  previewCode: FormControl<string>;
  showPreview: FormControl<boolean>;
}

interface TermForm {
  label: FormControl<string>;
  amountType: FormControl<string>;
  amountValue: FormControl<number>;
  termDays: FormControl<number>;
}

@Component({
  selector: 'app-customer-po-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './customer-po-form.html',
  styleUrl: './customer-po-form.scss',
})
export class CustomerPoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly poService = inject(CustomerPoService);
  private readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly poStatus = signal<PoStatus | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);
  /** PO terkonfirmasi: baris item tidak boleh dihapus (FG sudah dibuat) */
  readonly canRemoveLine = computed(() => {
    const s = this.poStatus();
    return !s || s === 'DRAFT';
  });
  readonly ppnRate = computed(() => this.settingsService.settings().ppnRate);
  /** Indeks baris yang sedang memuat preview kode FG */
  readonly previewLoading = signal<Set<number>>(new Set());

  readonly form = this.fb.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    customerPoRef: [''],
    poDate: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentTermTrigger: ['AFTER_PO_ISSUED' as PaymentTermTrigger, Validators.required],
    notes: [''],
    lines: this.fb.array<FormGroup<LineForm>>([]),
    terms: this.fb.array<FormGroup<TermForm>>([]),
  });

  get linesArray(): FormArray<FormGroup<LineForm>> {
    return this.form.controls.lines;
  }

  get termsArray(): FormArray<FormGroup<TermForm>> {
    return this.form.controls.terms;
  }

  get trigger(): PaymentTermTrigger {
    return this.form.controls.paymentTermTrigger.value as PaymentTermTrigger;
  }

  /** Sum of all PERCENT-type terms */
  termPercentTotal(): number {
    return this.termsArray.controls
      .filter((g) => g.getRawValue().amountType === 'PERCENT')
      .reduce((sum, g) => sum + (Number(g.getRawValue().amountValue) || 0), 0);
  }

  /** Preview due_date for one term (only for AFTER_PO_ISSUED) */
  previewTermDueDate(i: number): string | null {
    if (this.trigger !== 'AFTER_PO_ISSUED') return null;
    const poDate = this.form.controls.poDate.value;
    if (!poDate) return null;
    const termDays = Number(this.termsArray.at(i).getRawValue().termDays) || 0;
    const d = new Date(poDate);
    d.setDate(d.getDate() + termDays);
    return d.toISOString().slice(0, 10);
  }

  addTerm(): void {
    const hasPercentTerm = this.termsArray.controls.some((g) => g.getRawValue().amountType === 'PERCENT');
    const remaining = Math.max(0, 100 - this.termPercentTotal());
    const amountValue = !hasPercentTerm ? 100 : remaining > 0 ? remaining : 50;
    this.termsArray.push(this.makeTerm('', 'PERCENT', amountValue, 14));
  }

  removeTerm(i: number): void {
    if (this.termsArray.length <= 1) return;
    this.termsArray.removeAt(i);
  }

  private makeTerm(
    label = '',
    amountType: 'PERCENT' | 'FIXED' = 'PERCENT',
    amountValue = 100,
    termDays = 14
  ): FormGroup<TermForm> {
    return this.fb.nonNullable.group<TermForm>({
      label: this.fb.nonNullable.control(label),
      amountType: this.fb.nonNullable.control(amountType, Validators.required),
      amountValue: this.fb.nonNullable.control(amountValue, [Validators.required, Validators.min(0)]),
      termDays: this.fb.nonNullable.control(termDays, [Validators.required, Validators.min(0)]),
    });
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.editingId.set(Number(id));

    const requests: {
      customers: ReturnType<CustomerService['list']>;
      settings: ReturnType<SettingsService['load']>;
      po?: ReturnType<CustomerPoService['get']>;
    } = {
      customers: this.customerService.list({ search: undefined }),
      settings: this.settingsService.load(),
    };
    if (this.editingId()) {
      requests.po = this.poService.get(this.editingId()!);
    }

    forkJoin(requests as any).subscribe({
      next: (res: any) => {
        this.customers.set(res.customers);
        if (res.po) {
          this.poStatus.set(res.po.status);
          if (!this.auth.isSuperAdmin()) {
            this.errorMessage.set('Hanya superadmin yang dapat mengubah PO.');
          } else if (res.po.status === 'COMPLETED' || res.po.status === 'CANCELLED') {
            this.errorMessage.set('PO ini tidak dapat diubah lagi.');
          }
          this.form.patchValue({
            customerId: res.po.customer.id,
            customerPoRef: res.po.customerPoRef || '',
            poDate: res.po.poDate?.slice(0, 10) || res.po.poDate,
            paymentTermTrigger: res.po.paymentTermTrigger,
            notes: res.po.notes || '',
          });
          this.linesArray.clear();
          for (const line of res.po.lines) {
            this.linesArray.push(
              this.makeLine(line.itemName, line.qty, line.unit, line.unitPrice, line.ppnIncluded)
            );
          }
          this.termsArray.clear();
          if (res.po.paymentTerms && res.po.paymentTerms.length > 0) {
            for (const t of res.po.paymentTerms) {
              this.termsArray.push(this.makeTerm(t.label ?? '', t.amountType as 'PERCENT' | 'FIXED', t.amountValue, t.termDays));
            }
          } else {
            this.addTerm();
          }
        } else {
          this.addLine();
          this.addTerm();
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Gagal memuat data form');
        this.loading.set(false);
      },
    });
  }

  private makeLine(
    itemName = '',
    qty = 1,
    unit = 'pcs',
    unitPrice = 0,
    ppnIncluded = true
  ): FormGroup<LineForm> {
    const group = this.fb.nonNullable.group<LineForm>({
      itemName: this.fb.nonNullable.control(itemName, [Validators.required]),
      qty: this.fb.nonNullable.control(qty, [Validators.required, Validators.min(0.01)]),
      unit: this.fb.nonNullable.control(unit, [Validators.required]),
      unitPrice: this.fb.nonNullable.control(unitPrice, [Validators.required, Validators.min(0)]),
      ppnIncluded: this.fb.nonNullable.control(ppnIncluded),
      previewCode: this.fb.nonNullable.control(''),
      showPreview: this.fb.nonNullable.control(false),
    });
    this.bindPreviewCode(group);
    return group;
  }

  onItemNameFocus(index: number): void {
    const group = this.linesArray.at(index);
    group.controls.showPreview.setValue(true);
    this.refreshPreviewCode(index);
  }

  isPreviewLoading(index: number): boolean {
    return this.previewLoading().has(index);
  }

  private bindPreviewCode(group: FormGroup<LineForm>): void {
    group.controls.itemName.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((name) => {
          if (!group.controls.showPreview.value) return of(null);
          const trimmed = name?.trim();
          if (!trimmed) return of('');
          return this.poService.previewCode(trimmed).pipe(catchError(() => of('')));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((code) => {
        if (code === null) return;
        group.controls.previewCode.setValue(code || '', { emitEvent: false });
      });
  }

  addLine(): void {
    this.linesArray.push(this.makeLine());
  }

  removeLine(index: number): void {
    if (this.linesArray.length <= 1) return;
    this.linesArray.removeAt(index);
  }

  refreshPreviewCode(index: number): void {
    const group = this.linesArray.at(index);
    const name = group.controls.itemName.value?.trim();
    if (!name) {
      group.controls.previewCode.setValue('');
      this.clearPreviewLoading(index);
      return;
    }
    this.previewLoading.update((s) => new Set(s).add(index));
    this.poService.previewCode(name).subscribe({
      next: (code) => {
        group.controls.previewCode.setValue(code || '');
        this.clearPreviewLoading(index);
      },
      error: () => this.clearPreviewLoading(index),
    });
  }

  private clearPreviewLoading(index: number): void {
    this.previewLoading.update((s) => {
      const next = new Set(s);
      next.delete(index);
      return next;
    });
  }

  lineBreakdown(index: number) {
    const g = this.linesArray.at(index).getRawValue();
    return lineTaxBreakdown(
      Number(g.qty) || 0,
      Number(g.unitPrice) || 0,
      !!g.ppnIncluded,
      this.ppnRate()
    );
  }

  lineAmount(index: number): number {
    return this.lineBreakdown(index).total;
  }

  totalDpp(): number {
    let sum = 0;
    for (let i = 0; i < this.linesArray.length; i++) sum += this.lineBreakdown(i).dpp;
    return sum;
  }

  totalPpn(): number {
    let sum = 0;
    for (let i = 0; i < this.linesArray.length; i++) sum += this.lineBreakdown(i).ppn;
    return sum;
  }

  total(): number {
    let sum = 0;
    for (let i = 0; i < this.linesArray.length; i++) sum += this.lineAmount(i);
    return sum;
  }

  /** @deprecated kept for backward-compat; no longer shown in UI */
  computedDueDate(): string | null { return null; }

  save(): void {
    this.errorMessage.set(null);
    if (this.isEditMode() && !this.auth.isSuperAdmin()) {
      this.errorMessage.set('Hanya superadmin yang dapat mengubah PO.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Periksa kembali isian form.');
      return;
    }

    const value = this.form.getRawValue();
    const input: CustomerPoInput = {
      customerId: Number(value.customerId),
      customerPoRef: value.customerPoRef || null,
      poDate: value.poDate,
      paymentTermTrigger: value.paymentTermTrigger as PaymentTermTrigger,
      notes: value.notes || null,
      lines: value.lines.map((l) => ({
        itemName: l.itemName.trim(),
        qty: Number(l.qty),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        ppnIncluded: !!l.ppnIncluded,
      })),
      paymentTerms: value.terms.map((t): PaymentTermInput => ({
        label: (t.label as string) || null,
        amountType: t.amountType as 'PERCENT' | 'FIXED',
        amountValue: Number(t.amountValue),
        termDays: Number(t.termDays),
      })),
    };

    this.saving.set(true);
    const obs = this.isEditMode()
      ? this.poService.update(this.editingId()!, input)
      : this.poService.create(input);

    obs.subscribe({
      next: (po) => {
        this.saving.set(false);
        const msg = this.isEditMode()
          ? 'Perubahan PO disimpan'
          : 'PO disimpan — Master Item FG & todo BOM sudah dibuat';
        this.snackBar.open(msg, 'OK', { duration: 4500 });
        this.router.navigate(['/customer-pos', po.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'Gagal menyimpan PO');
      },
    });
  }

  cancel(): void {
    if (this.isEditMode()) {
      this.router.navigate(['/customer-pos', this.editingId()]);
    } else {
      this.router.navigate(['/customer-pos']);
    }
  }
}
