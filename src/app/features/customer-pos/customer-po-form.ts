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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CustomerService } from '../../core/services/customer.service';
import { CustomerPoService } from '../../core/services/customer-po.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { Customer } from '../../core/models/customer.model';
import { CustomerPoInput, PaymentTermTrigger } from '../../core/models/customer-po.model';
import { lineTaxBreakdown } from '../../core/utils/ppn.util';

interface LineForm {
  itemName: FormControl<string>;
  qty: FormControl<number>;
  unit: FormControl<string>;
  unitPrice: FormControl<number>;
  ppnIncluded: FormControl<boolean>;
  previewCode: FormControl<string>;
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
    MatProgressSpinnerModule,
    MatTooltipModule,
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

  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);
  readonly ppnRate = computed(() => this.settingsService.settings().ppnRate);

  readonly form = this.fb.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    customerPoRef: [''],
    poDate: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentTermTrigger: ['AFTER_PO_ISSUED' as PaymentTermTrigger, Validators.required],
    paymentTermDays: [14, [Validators.required, Validators.min(0)]],
    notes: [''],
    lines: this.fb.array<FormGroup<LineForm>>([]),
  });

  get linesArray(): FormArray<FormGroup<LineForm>> {
    return this.form.controls.lines;
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
          if (!this.auth.isSuperAdmin()) {
            this.errorMessage.set('Hanya superadmin yang dapat mengubah PO.');
          } else if (res.po.status !== 'DRAFT') {
            this.errorMessage.set('Hanya PO DRAFT yang dapat diubah.');
          }
          this.form.patchValue({
            customerId: res.po.customer.id,
            customerPoRef: res.po.customerPoRef || '',
            poDate: res.po.poDate?.slice(0, 10) || res.po.poDate,
            paymentTermTrigger: res.po.paymentTermTrigger,
            paymentTermDays: res.po.paymentTermDays,
            notes: res.po.notes || '',
          });
          this.linesArray.clear();
          for (const line of res.po.lines) {
            this.linesArray.push(
              this.makeLine(line.itemName, line.qty, line.unit, line.unitPrice, line.ppnIncluded)
            );
            this.refreshPreviewCode(this.linesArray.length - 1);
          }
        } else {
          this.addLine();
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
    });
    this.bindPreviewCode(group);
    return group;
  }

  private bindPreviewCode(group: FormGroup<LineForm>): void {
    group.controls.itemName.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((name) => {
          const trimmed = name?.trim();
          if (!trimmed) return of('');
          return this.poService.previewCode(trimmed).pipe(catchError(() => of('')));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((code) => {
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
      return;
    }
    this.poService.previewCode(name).subscribe({
      next: (code) => group.controls.previewCode.setValue(code || ''),
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

  computedDueDate(): string | null {
    const { poDate, paymentTermDays, paymentTermTrigger } = this.form.getRawValue();
    if (paymentTermTrigger !== 'AFTER_PO_ISSUED') return null;
    if (!poDate) return null;
    const d = new Date(poDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + Number(paymentTermDays || 0));
    return d.toISOString().slice(0, 10);
  }

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
      paymentTermTrigger: value.paymentTermTrigger,
      paymentTermDays: Number(value.paymentTermDays),
      notes: value.notes || null,
      lines: value.lines.map((l) => ({
        itemName: l.itemName.trim(),
        qty: Number(l.qty),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        ppnIncluded: !!l.ppnIncluded,
      })),
    };

    this.saving.set(true);
    const obs = this.isEditMode()
      ? this.poService.update(this.editingId()!, input)
      : this.poService.create(input);

    obs.subscribe({
      next: (po) => {
        this.saving.set(false);
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
