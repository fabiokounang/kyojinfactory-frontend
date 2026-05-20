import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe, DatePipe } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VendorPoService } from '../../core/services/vendor-po.service';
import { VendorService } from '../../core/services/vendor.service';
import { MasterItemService } from '../../core/services/master-item.service';
import { Vendor } from '../../core/models/vendor.model';
import { MasterItem } from '../../core/models/master-item.model';
import { PaymentMode, VendorPo } from '../../core/models/vendor-po.model';

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
    MatRadioModule,
    MatCheckboxModule,
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

  readonly editId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly vendors = signal<Vendor[]>([]);
  readonly rawWipItems = signal<MasterItem[]>([]);

  readonly paymentModeOpts: { label: string; value: PaymentMode }[] = [
    { label: 'Lunas di muka (Upfront)', value: 'UPFRONT' },
    { label: 'DP lalu pelunasan saat terima barang', value: 'DP_THEN_RECEIPT' },
    { label: 'Bayar penuh saat terima barang', value: 'ON_RECEIPT' },
  ];

  readonly form = this.fb.nonNullable.group({
    vendorId:        [0, [Validators.required, Validators.min(1)]],
    poDate:          ['', Validators.required],
    vendorRef:       [''],
    paymentMode:     ['ON_RECEIPT' as PaymentMode, Validators.required],
    paymentTermDays: [14, [Validators.required, Validators.min(0), Validators.max(365)]],
    dpAmount:        [null as number | null],
    notes:           [''],
    lines:           this.fb.array<FormGroup>([], Validators.minLength(1)),
  });

  readonly formInvalid = toSignal(
    this.form.statusChanges.pipe(
      startWith(this.form.status),
      map((s) => s === 'INVALID'),
    ),
    { initialValue: true },
  );

  get linesArray(): FormArray<FormGroup> { return this.form.controls.lines; }
  get paymentMode(): PaymentMode { return this.form.controls.paymentMode.value as PaymentMode; }

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
        error: () => { this.loading.set(false); this.router.navigate(['/vendor-pos']); },
      });
    } else {
      this.addLine();
    }
  }

  private prefillForm(vpo: VendorPo): void {
    this.form.patchValue({
      vendorId:        vpo.vendor.id,
      poDate:          vpo.poDate,
      vendorRef:       vpo.vendorRef ?? '',
      paymentMode:     vpo.paymentMode,
      paymentTermDays: vpo.paymentTermDays,
      dpAmount:        vpo.dpAmount,
      notes:           vpo.notes ?? '',
    });
    this.linesArray.clear();
    for (const l of vpo.lines) {
      this.linesArray.push(this.buildLine({
        usesMasterItem: !!l.masterItemId,
        masterItemId:   l.masterItemId,
        itemName:       l.itemName,
        qty:            l.qty,
        unit:           l.unit,
        unitPrice:      l.unitPrice,
        ppnIncluded:    l.ppnIncluded,
        stdSize:        l.stdSize,
      }));
    }
    this.loading.set(false);
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
      masterItemId:   [defaults?.masterItemId ?? null as number | null],
      itemName:       [defaults?.itemName ?? '', Validators.required],
      qty:            [defaults?.qty ?? 1, [Validators.required, Validators.min(0.01)]],
      unit:           [defaults?.unit ?? 'pcs', Validators.required],
      unitPrice:      [defaults?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      ppnIncluded:    [defaults?.ppnIncluded ?? true],
      stdSize:        [defaults?.stdSize ?? ''],
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
    const net = (Number(g.qty) || 0) * (Number(g.unitPrice) || 0);
    if (g.ppnIncluded) return net;
    const ppnRate = 11;
    return net + net * (ppnRate / 100);
  }

  grandTotal(): number {
    let t = 0;
    for (let i = 0; i < this.linesArray.length; i++) t += this.lineTotal(i);
    return t;
  }

  submit(): void {
    if (this.formInvalid() || this.busy()) return;
    this.busy.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      vendorId:        raw.vendorId,
      poDate:          raw.poDate,
      vendorRef:       raw.vendorRef || null,
      paymentMode:     raw.paymentMode as PaymentMode,
      paymentTermDays: raw.paymentTermDays,
      dpAmount:        raw.paymentMode === 'DP_THEN_RECEIPT' ? (raw.dpAmount || null) : null,
      notes:           raw.notes || null,
      lines: raw.lines.map((l: Record<string, unknown>) => ({
        itemName:     String(l['itemName'] ?? ''),
        masterItemId: l['usesMasterItem'] ? (l['masterItemId'] as number | null) : null,
        qty:          Number(l['qty']),
        unit:         String(l['unit'] ?? 'pcs'),
        unitPrice:    Number(l['unitPrice']),
        ppnIncluded:  Boolean(l['ppnIncluded']),
        stdSize:      (l['stdSize'] as string) || null,
      })),
    };

    const op = this.editId()
      ? this.vpoService.update(this.editId()!, payload)
      : this.vpoService.create(payload);

    op.subscribe({
      next: (vpo) => {
        this.snackBar.open(this.editId() ? 'PO diperbarui' : 'PO Vendor berhasil dibuat', 'OK', { duration: 3000 });
        this.router.navigate(['/vendor-pos', vpo.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message || 'Gagal menyimpan', 'Tutup', { duration: 5000 });
        this.busy.set(false);
      },
    });
  }

  cancel(): void {
    const id = this.editId();
    this.router.navigate(id ? ['/vendor-pos', id] : ['/vendor-pos']);
  }

  get title(): string { return this.editId() ? 'Edit PO Vendor' : 'Buat PO Vendor Baru'; }
}
