// Phase 1 — Potion tier configuration
import type { PotionConfig } from '../types/pellet';

export const POTION_CONFIGS: Record<string, PotionConfig> = {
  small: {
    tier: 'small',
    radius: 6,
    scoreValue: 10,
    lengthGrowth: 1,
    color: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.7)',
    spawnWeight: 65,
  },
  medium: {
    tier: 'medium',
    radius: 10,
    scoreValue: 30,
    lengthGrowth: 2,
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.7)',
    spawnWeight: 28,
  },
  large: {
    tier: 'large',
    radius: 15,
    scoreValue: 75,
    lengthGrowth: 3,
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.8)',
    spawnWeight: 7,
  },
};

// Total weight for weighted random selection
export const TOTAL_WEIGHT = Object.values(POTION_CONFIGS)
  .reduce((sum, c) => sum + c.spawnWeight, 0); // = 100
