export interface CameraBreakdown {
  total: number;
  ogolna: number;
  lpr: number;
  skp: number;
}

export interface CameraRow {
  type: 'Ogólna' | 'LPR' | 'SKP';
  quantity: number;
  quantityPerPole: number;
}
