export type BomStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface BomVersion {
  id: number;
  fgId: number;
  fgCode: string;
  fgName: string;
  fgUnit: string;
  versionName: string;
  status: BomStatus;
  notes: string | null;
  createdBy: number | null;
  componentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BomComponent {
  id: number;
  fgId: number;
  bomVersionId: number;
  level: number;
  parentComponentId: number | null;
  componentName: string;
  componentCode: string;
  runningNumber: number;
  qtyPerParent: number;
  unit: string;
  size: string | null;
  wastePercent: number;
  hasNextLevel: boolean;
  isRaw: boolean;
  masterItemId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingParent {
  id: number;
  componentCode: string;
  componentName: string;
}

export interface BomProgress {
  maxLevel: number;
  pendingByLevel: Record<string, PendingParent[]>;
  nextLevelToFill: number;
  completed: boolean;
}

export interface BomDetail {
  version: BomVersion;
  components: BomComponent[];
  progress: BomProgress;
}

export interface BomVersionInput {
  fgId: number;
  versionName: string;
  notes?: string | null;
}

export interface BomComponentInput {
  componentName: string;
  componentCode: string;
  qtyPerParent: number;
  unit: string;
  size?: string | null;
  wastePercent: number;
  hasNextLevel: boolean;
}

export interface BomBulkInput {
  level: number;
  parentId: number | null;
  rows: BomComponentInput[];
}
