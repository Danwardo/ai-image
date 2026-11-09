import { ReferenceScene } from '../types';

export const PRESET_SCENES: ReferenceScene[] = [
  {
    id: 'preset-japandi-room',
    title: 'Japandi Light Oak Interior',
    description: 'Natural oak floor, warm sunlight from large side windows, textured plaster wall.',
    previewUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    isPreset: true,
    suggestedAnchor: { x: 50, y: 72 }
  },
  {
    id: 'preset-travertine-terrace',
    title: 'Mediterranean Travertine Terrace',
    description: 'Honed limestone deck, warm natural Mediterranean sunlight, olive greenery.',
    previewUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    isPreset: true,
    suggestedAnchor: { x: 50, y: 76 }
  },
  {
    id: 'preset-concrete-loft',
    title: 'Architectural Minimalist Loft',
    description: 'Polished micro-cement floor, expansive floor-to-ceiling glass, soft diffused daylight.',
    previewUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    isPreset: true,
    suggestedAnchor: { x: 48, y: 74 }
  },
  {
    id: 'preset-studio-cyclorama',
    title: 'Neutral Architectural Showroom',
    description: 'Seamless warm beige backdrop, neutral stone podium flooring, studio directional lighting.',
    previewUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    isPreset: true,
    suggestedAnchor: { x: 50, y: 70 }
  }
];
