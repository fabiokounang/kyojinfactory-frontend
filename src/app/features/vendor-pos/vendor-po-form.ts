import { Component, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VendorPoService } from '../../core/services/vendor-po.service';
import { VendorService } from '../../core/services/vendor.service';
import { MasterItemService } from '../../core/services/master-item.service';
import { Vendor } from '../../core/models/vendor.model';
import { MasterItem } from '../../core/models/master-item.model';
import { AuthService } from '../../core/services/auth.service';
import {
  PaymentTermInput,
  PaymentTermTrigger,
  VendorPo,
  VendorPoInput,
  VendorPoStatus,
} from '../../core/models/vendor-po.model';

interface TermForm {
  label: FormControl<string>;
  amountType: FormControl<string>;
  amountValue: FormControl<number>;
  termDays: FormControl<number>;
}

@Component({
  selector: 'app-vendor-po-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './vendor-po-form.html',
  styleUrl: './vendor-po-form.scss',
})
export class VendorPoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vpoService = inject(VendorPoService);
  private readonly vendorService = inject(VendorService);
  private readonly masterItemService = inject(MasterItemService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly editId = signal<number | null>(null);
  readonly poStatus = signal<VendorPoStatus | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly vendors = signal<Vendor[]>([]);
  readonly rawWipItems = signal<MasterItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    vendorId: [0, [Validators.required, Validators.min(1)]],
    poDate: [new Date().toISOString().slice(0, 10), Validators.required],
    vendorRef: [''],
    paymentTermTrigger: ['AFTER_GOODS_RECEIVED' as PaymentTermTrigger, Validators.required],
    notes: [''],
    lines: this.fb.array<FormGroup>([], Validators.minLength(1)),
    terms: this.fb.array<FormGroup<TermForm>>([]),
  });

  readonly formInvalid = toSignal(
    this.form.statusChanges.pipe(
      startWith(this.form.status),
      map((s) => s === 'INVALID'),
    ),
    { initialValue: true },
  );

  get linesArray(): FormArray<FormGroup> {
    return this.form.controls.lines;
  }

  get termsArray(): FormArray<FormGroup<TermForm>> {
    return this.form.controls.terms;
  }

  get trigger(): PaymentTermTrigger {
    return this.form.controls.paymentTermTrigger.value as PaymentTermTrigger;
  }

  readonly canEditLines = computed(() => {
    const s = this.poStatus();
    return !s || s === 'DRAFT' || s === 'CONFIRMED';
  });

  termPercentTotal(): number {
    return this.termsArray.controls
      .filter((g) => g.getRawValue().amountType === 'PERCENT')
      .reduce((sum, g) => sum + (Number(g.getRawValue().amountValue) || 0), 0);
  }

  previewTermDueDate(i: number): string | null {
    if (this.trigger !== 'AFTER_PO_ISSUED') return null;
    const poDate = this.form.controls.poDate.value;
    if (!poDate) return null;
    const termDays = Number(this.termsArray.at(i).getRawValue().termDays) || 0;
    const d = new Date(poDate);
    d.setDate(d.getDate() + termDays);
    return d.toISOString().slice(0, 10);
  }

  constructor() {
    this.vendorService.list().subscribe((v) => this.vendors.set(v));
    this.masterItemService.list({ category: 'RAW' }).subscribe((items) => {
      this.masterItemService.list({ category: 'WIP' }).subscribe((wip) => {
        this.rawWipItems.set([...items, ...wip].sort((a, b) => a.name.localeCompare(b.name)));
      });
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editId.set(id);
      this.loading.set(true);
      this.vpoService.get(id).subscribe({
        next: (vpo) => this.prefillForm(vpo),
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/vendor-pos']);
        },
      });
    } else {
      this.addLine();
      this.addTerm();
    }
  }

  private prefillForm(vpo: VendorPo): void {
    this.poStatus.set(vpo.status);
    if (!this.auth.isSuperAdmin()) {
      this.errorMessage.set('Hanya superadmin yang dapat mengubah PO.');
    } else if (vpo.status !== 'CONFIRMED' && vpo.status !== 'DRAFT') {
      this.errorMessage.set('PO ini tidak dapat diubah lagi.');
    }
    this.form.patchValue({
      vendorId: vpo.vendor.id,
      poDate: vpo.poDate?.slice(0, 10) || vpo.poDate,
      vendorRef: vpo.vendorRef ?? '',
      paymentTermTrigger: vpo.paymentTermTrigger || 'AFTER_GOODS_RECEIVED',
      notes: vpo.notes ?? '',
    });
    this.linesArray.clear();
    for (const l of vpo.lines) {
      this.linesArray.push(
        this.buildLine({
          usesMasterItem: !!l.masterItemId,
          masterItemId: l.masterItemId,
          itemName: l.itemName,
          qty: l.qty,
          unit: l.unit,
          unitPrice: l.unitPrice,
          ppnIncluded: l.ppnIncluded,
          stdSize: l.stdSize,
        })
      );
    }
    this.termsArray.clear();
    if (vpo.paymentTerms?.length) {
      for (const t of vpo.paymentTerms) {
        this.termsArray.push(
          this.makeTerm(t.label ?? '', t.amountType, t.amountValue, t.termDays)
        );
      }
    } else {
      this.addTerm();
    }
    this.loading.set(false);
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
      amountValue: this.fb.nonNullable.control(amountValue, [
        Validators.required,
        Validators.min(0),
      ]),
      termDays: this.fb.nonNullable.control(termDays, [
        Validators.required,
        Validators.min(0),
      ]),
    });
  }

  addTerm(): void {
    const hasPercentTerm = this.termsArray.controls.some(
      (g) => g.getRawValue().amountType === 'PERCENT'
    );
    const remaining = Math.max(0, 100 - this.termPercentTotal());
    const amountValue = !hasPercentTerm ? 100 : remaining > 0 ? remaining : 50;
    this.termsArray.push(this.makeTerm('', 'PERCENT', amountValue, 14));
  }

  removeTerm(i: number): void {
    if (this.termsArray.length <= 1) return;
    this.termsArray.removeAt(i);
  }

  private buildLine(defaults?: Partial<{
    usesMasterItem: boolean;
    masterItemId: number | null;
    itemName: string;
    qty: number;
    unit: string;
    unitPrice: number;
    ppnIncluded: boolean;
    stdSize: string | null;
  }>): FormGroup {
    return this.fb.nonNullable.group({
      usesMasterItem: [defaults?.usesMasterItem ?? false],
      masterItemId: [defaults?.masterItemId ?? null as number | null],
      itemName: [defaults?.itemName ?? '', Validators.required],
      qty: [defaults?.qty ?? 1, [Validators.required, Validators.min(0.01)]],
      unit: [defaults?.unit ?? 'pcs', Validators.required],
      unitPrice: [defaults?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      ppnIncluded: [defaults?.ppnIncluded ?? true],
      stdSize: [defaults?.stdSize ?? ''],
    });
  }

  addLine(): void {
    this.linesArray.push(this.buildLine());
  }

  removeLine(i: number): void {
    this.linesArray.removeAt(i);
  }

  onToggleMasterItem(i: number, useMaster: boolean): void {
    const group = this.linesArray.at(i);
    if (!useMaster) {
      group.patchValue({ masterItemId: null });
    }
  }

  onMasterItemSelect(i: number, itemId: number): void {
    const item = this.rawWipItems().find((m) => m.id === itemId);
    if (item) {
      this.linesArray.at(i).patchValue({ itemName: item.name, unit: item.unit || 'pcs' });
    }
  }

  lineTotal(i: number): number {
    const g = this.linesArray.at(i).getRawValue();
    const net = (Number(g['qty']) || 0) * (Number(g['unitPrice']) || 0);
    if (g['ppnIncluded']) return net;
    const ppnRate = 11;
    return net + net * (ppnRate / 100);
  }

  grandTotal(): number {
    let t = 0;
    for (let i = 0; i < this.linesArray.length; i++) t += this.lineTotal(i);
    return t;
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.editId() && !this.auth.isSuperAdmin()) {
      this.errorMessage.set('Hanya superadmin yang dapat mengubah PO.');
      return;
    }
    if (this.formInvalid() || this.busy()) return;
    this.busy.set(true);
    const raw = this.form.getRawValue();
    const payload: VendorPoInput = {
      vendorId: raw.vendorId,
      poDate: raw.poDate,
      vendorRef: raw.vendorRef || null,
      paymentTermTrigger: raw.paymentTermTrigger as PaymentTermTrigger,
      notes: raw.notes || null,
      lines: raw.lines.map((l) => ({
        itemName: String(l['itemName'] ?? ''),
        masterItemId: l['usesMasterItem'] ? (l['masterItemId'] as number | null) : null,
        qty: Number(l['qty']),
        unit: String(l['unit'] ?? 'pcs'),
        unitPrice: Number(l['unitPrice']),
        ppnIncluded: Boolean(l['ppnIncluded']),
        stdSize: (l['stdSize'] as string) || null,
      })),
      paymentTerms: raw.terms.map(
        (t): PaymentTermInput => ({
          label: (t.label as string) || null,
          amountType: t.amountType as 'PERCENT' | 'FIXED',
          amountValue: Number(t.amountValue),
          termDays: Number(t.termDays),
        })
      ),
    };

    const op = this.editId()
      ? this.vpoService.update(this.editId()!, payload)
      : this.vpoService.create(payload);

    op.subscribe({
      next: (vpo) => {
        this.snackBar.open(
          this.editId() ? 'Perubahan PO disimpan' : 'PO Vendor disimpan',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/vendor-pos', vpo.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.errorMessage.set(err.error?.message || 'Gagal menyimpan');
      },
    });
  }

  cancel(): void {
    const id = this.editId();
    this.router.navigate(id ? ['/vendor-pos', id] : ['/vendor-pos']);
  }

  get title(): string {
    return this.editId() ? 'Edit PO Vendor' : 'Buat PO Vendor Baru';
  }
}
