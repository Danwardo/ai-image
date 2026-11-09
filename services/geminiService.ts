
import { GoogleGenAI } from "@google/genai";
import { InsertionSettings, PerformanceSpeed, SupportedAspectRatio } from '../types';

export const MODEL_NAME = 'gemini-3.1-flash-image';

export type { SupportedAspectRatio };

export interface ProcessImageOptions {
  imageContent: string;
  prompt?: string;
  aspectRatio?: SupportedAspectRatio;
  referenceImageContent?: string | null;
  settings?: InsertionSettings;
  speedMode?: PerformanceSpeed;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = (typeof process !== 'undefined' && (process.env?.API_KEY || process.env?.GEMINI_API_KEY)) ||
                 (window as any).process?.env?.API_KEY ||
                 (window as any).process?.env?.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey });
}

export async function editImageBackground(
  imageContent: string, 
  prompt: string = '',
  aspectRatio: SupportedAspectRatio = "1:1",
  referenceImageContent?: string | null,
  settings?: InsertionSettings
): Promise<string> {
  const ai = getGenAIClient();
  
  const speedMode = settings?.performanceSpeed || 'turbo';
  // Map speed mode to Gemini imageSize for optimal latency
  // 1K generates substantially faster (typically 3-6s) compared to 4K (20-40s)
  const imageSize = speedMode === 'turbo' ? '1K' : (speedMode === 'studio' ? '2K' : '4K');

  const getMimeType = (content: string) => {
    const match = content.match(/^data:([^;]+);base64,/);
    return match ? match[1] : 'image/jpeg';
  };

  const parts: any[] = [
    {
      inlineData: {
        data: imageContent.split(',')[1],
        mimeType: getMimeType(imageContent),
      },
    }
  ];

  let systemInstruction = `You are a world-class architectural visualizer and product compositor.
Your mission is to seamlessly insert physical furniture products into 3D interior/exterior scenes with flawless realism, perspective alignment, and photographic accuracy.

CORE TENETS:
1. ABSOLUTE SUBJECT INTEGRITY: The furniture piece depicted in the first image must remain 100% faithful in structure, design, wood/metal/fabric textures, geometry, seams, cushions, and colors. Do not hallucinate alterations, redesigns, or variations.
2. ZERO EXTRA FURNITURE: Under no circumstances should duplicate or random new pieces of furniture (chairs, couches, tables) be introduced. Only insert the exact furniture provided.
3. PHYSICAL GROUNDING: Ground the furniture firmly on the floor plane with realistic contact ambient occlusion directly beneath the legs/base and natural directional drop shadows matching the environment's light sources.
4. ARCHITECTURAL HARMONY: Blend the furniture into the scene's ambient illumination and reflections while leaving the reference room's architectural elements, walls, flooring, and background intact.`;

  if (referenceImageContent) {
    parts.push({
      inlineData: {
        data: referenceImageContent.split(',')[1],
        mimeType: getMimeType(referenceImageContent),
      },
    });

    // Compute anchor directive
    let anchorDirective = "Center of the room on the floor plane.";
    if (settings?.anchor === 'left') {
      anchorDirective = "In the left foreground/midground section of the room on the floor plane.";
    } else if (settings?.anchor === 'right') {
      anchorDirective = "In the right foreground/midground section of the room on the floor plane.";
    } else if (settings?.anchor === 'custom' && settings?.customPoint) {
      anchorDirective = `At coordinates approximately ${Math.round(settings.customPoint.x)}% horizontal and ${Math.round(settings.customPoint.y)}% vertical in the scene perspective, firmly on the ground plane.`;
    }

    // Compute scale depth directive
    let scaleDirective = "Natural, real-world architectural scale proportional to room ceiling height, windows, and surrounding space.";
    if (settings?.scaleDepth === 'hero') {
      scaleDirective = "Prominent foreground hero product placement, capturing crisp textures and fine material details.";
    } else if (settings?.scaleDepth === 'accent') {
      scaleDirective = "Tasteful mid-to-background room accent piece, harmonizing subtly with the overall interior.";
    }

    const shadowDirective = settings?.lockGroundShadows !== false
      ? "Apply realistic floor contact shadows (ambient occlusion) under all feet/legs/base, and soft directional cast shadows consistent with the room's primary window or fixture light."
      : "Ensure clean ground integration.";

    const lightingDirective = settings?.matchLighting !== false
      ? "Match the ambient color temperature, bounce lighting from the floor, and directional highlights of the reference scene without altering the authentic color of the furniture's upholstery or materials."
      : "Preserve original studio lighting with clean edge integration.";

    const additionalNotes = prompt.trim() ? `Additional Scene Placement Notes: "${prompt.trim()}".` : "";

    parts.push({
      text: `TASK: FURNITURE INSERTION INTO REFERENCE SCENE

1. IMAGE 1 (FURNITURE PRODUCT):
   - Extract and preserve the furniture piece shown in Image 1.
   - Maintain its exact form, upholstery texture, frame, material finishes, joints, and colors with pixel-faithful precision.
   
2. IMAGE 2 (DESIGNED REFERENCE SCENE):
   - This is the designed reference environment (room/deck/interior) where the furniture must be inserted.
   - Keep the architecture, walls, floor material, windows, background views, and ambient environment of this scene completely intact.

3. SPATIAL PLACEMENT & ACCURACY:
   - TARGET PLACEMENT: ${anchorDirective}
   - SCALE & PROPORTIONS: ${scaleDirective}
   - GROUNDING & SHADOWS: ${shadowDirective}
   - LIGHTING HARMONY: ${lightingDirective}
   ${additionalNotes}

4. STRICT CONSTRAINTS:
   - Do NOT add any extra furniture, chairs, or duplicate objects.
   - Do NOT modify the furniture's original design or color palette.
   - Blend the furniture seamlessly into the reference scene as if it was originally staged and photographed in this room.`
    });
  } else {
    // Background generation mode (when no reference scene is attached)
    parts.push({
      text: `Background Replacement Task:
- Keep the foreground furniture product in the input image completely unchanged in shape, material, texture, and color.
- Generate and place it within this new background setting: "${prompt || 'Modern minimalist interior showroom with soft daylight and concrete flooring'}".
- Cast realistic contact and directional shadows on the ground matching the new setting.
- Do not duplicate or add extra furniture items.`,
    });
  }

  const contents: any = { parts };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        imageConfig: {
          aspectRatio,
          imageSize: imageSize as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Spatial placement failed to generate output. Please verify reference images.");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found") || error.status === 401 || error.status === 403) {
      throw new Error("API_KEY_EXPIRED");
    }
    throw error;
  }
}


export async function generateSeoKeywords(imageContent: string, prompt: string): Promise<string> {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (window as any).process?.env?.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_EXPIRED");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are an SEO Marketing Expert specialized in product photography.
  Your task is to identify the main subject of an image and pair it with the context of a new background environment.
  
  RULES:
  1. Generate exactly 10 descriptive words or short phrases.
  2. Join them with hyphens (kebab-case).
  3. FOCUS on the subject first, then the setting, then the mood.
  4. Ensure it's optimized for search (e.g. "modern-picnic-table-oak-wood-sunny-park-outdoor-lifestyle-high-res-furniture").
  5. RETURN ONLY the kebab-case string. No preamble or explanation.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: imageContent.split(',')[1],
            mimeType: 'image/png'
          }
        },
        `MAIN SUBJECT: Identify the object/person in this image.
         NEW CONTEXT: "${prompt}".
         TASK: Combine the Subject and Context into 10 SEO-optimized keywords.`
      ],
      config: {
        systemInstruction,
      }
    });
    
    // Clean up response if it has spaces or extra punctuation
    const text = result.text || '';
    return text.trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .toLowerCase()
      .split('-')
      .slice(0, 10)
      .join('-');
  } catch (error) {
    console.error("SEO keyword generation failed:", error);
    return ""; // Fallback
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function getClosestAspectRatio(width: number, height: number): SupportedAspectRatio {
  const ratio = width / height;
  const supported = {
    "1:1": 1,
    "3:4": 3/4,
    "4:3": 4/3,
    "9:16": 9/16,
    "16:9": 16/9
  };
  
  let closest: SupportedAspectRatio = "1:1";
  let minDiff = Infinity;
  
  for (const [key, value] of Object.entries(supported)) {
    const diff = Math.abs(ratio - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = key as SupportedAspectRatio;
    }
  }
  
  return closest;
}
