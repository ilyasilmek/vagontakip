export const WAGON_STATUSES = ['Bekliyor', 'Parça bekliyor', 'Bakım devam ediyor', 'Tamamlandı'] as const;
export type WagonStatus = typeof WAGON_STATUSES[number];
export const WAGON_TYPES = ['Hbbills', 'Habins', 'Gabs', 'Sgns', 'Sggmrss', 'Rns', 'Eanos', 'Fals', 'Tagnpps', 'Uacs', 'Zans', 'Zacns', 'Laaes', 'Falns', 'Roos', 'Shimmns', 'Tamns', 'Remms', 'Sggrss', 'Zaes'] as const;
export type WagonType = typeof WAGON_TYPES[number];
export type UserRole = 'admin' | 'user';

export interface RecordMetadata {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Wagon extends RecordMetadata {
  number: string;
  wagonType?: WagonType | '';
  entryDate: string;
  channelDate: string;
  completedDate: string;
  status: WagonStatus;
  notes: string;
}

export interface Part extends RecordMetadata {
  type: string;
  brand: string;
  quantity: number;
  serialNumber: string;
  wagonNumber: string;
  removedDate: string;
  sentDate: string;
  returnedDate: string;
  faultNotes: string;
}

export interface Inventory extends RecordMetadata {
  type: string;
  brand: string;
  quantity: number;
  serialNumber: string;
}

export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: 'wagon' | 'part' | 'inventory' | 'user' | 'system';
  entityId?: string;
  details?: string;
}

export interface DataResponse {
  version: number;
  updatedAt: string;
  wagons: Wagon[];
  parts: Part[];
  inventory: Inventory[];
  user: SafeUser;
}

export type CollectionName = 'wagons' | 'parts' | 'inventory';
export type OperationalRecord = Wagon | Part | Inventory;
export interface RecordResponse { record: OperationalRecord; version: number; }
export interface ApiError { error: string; code?: string; }
