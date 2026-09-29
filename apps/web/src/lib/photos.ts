// Photo slots and their minimum sizes (DESIGN §6.1, src/assets/photos/README.md).
export const photoSlots = {
  problem: { width: 2400, height: 1030 },
  closing: { width: 2000, height: 1125 },
  og: { width: 1200, height: 630 },
} as const;

export type PhotoSlotName = keyof typeof photoSlots;
