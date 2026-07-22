// Phase 1 — Potion tier configuration
import type { PotionConfig } from '../types/pellet';

export const POTION_CONFIGS: Record<string, PotionConfig> = {
  small: {
    tier: 'small',
    radius: 6,
    scoreValue: 10,
    lengthGrowth: 1,
    color: '#bef264',
    glowColor: 'rgba(190, 242, 100, 0.6)',
    spawnWeight: 65,
  },
  medium: {
    tier: 'medium',
    radius: 10,
    scoreValue: 30,
    lengthGrowth: 2,
    color: '#fde047',
    glowColor: 'rgba(253, 224, 71, 0.7)',
    spawnWeight: 28,
  },
  large: {
    tier: 'large',
    radius: 16,
    scoreValue: 75,
    lengthGrowth: 3,
    color: '#fef08a',
    glowColor: 'rgba(254, 240, 138, 0.9)',
    spawnWeight: 7,
  },
};

// Total weight for weighted random selection
export const TOTAL_WEIGHT = Object.values(POTION_CONFIGS)
  .reduce((sum, c) => sum + c.spawnWeight, 0); // = 100
