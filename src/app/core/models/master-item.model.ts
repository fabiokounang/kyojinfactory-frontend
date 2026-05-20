export type ItemCategory = 'RAW' | 'WIP' | 'FG';

export interface MasterItemUpdateInput {
  name: string;
  unit: string;
  stdSize?: string | null;
}

export interface MasterItem {
  id: number;
  code: string;
  name: string;
  category: ItemCategory;
  unit: string;
  stdSize: string | null;
  version: string;
  sourcePoLineId: number | null;
  createdAt: string;
  updatedAt: string;
}
