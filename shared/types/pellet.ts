// Phase 1 — Pellet/Potion types

export type PotionTier = 'small' | 'medium' | 'large';

export interface PotionConfig {
  tier: PotionTier;
  radius: number;       // collision + visual radius
  scoreValue: number;   // score added on eat
  lengthGrowth: number; // segments added on eat
  color: string;        // primary fill color (hex)
  glowColor: string;    // shadowColor for glow effect
  spawnWeight: number;  // relative spawn probability
}

export interface Pellet {
  id: string;           // unique id (for future Redux keying)
  x: number;
  y: number;
  tier: PotionTier;
}
