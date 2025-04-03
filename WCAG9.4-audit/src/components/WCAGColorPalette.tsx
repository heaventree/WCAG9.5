import React, { useState, useRef } from 'react';
import { RefreshCw, Copy, Info, Check, Download, FileText, FileDown, Settings, X, Palette } from 'lucide-react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface ColorCombination {
  background: string;
  text: string;
  name: string;
  ratio: number;
  wcagLevel: 'AAA' | 'AA' | 'Fail';
  isBaseColor?: boolean;
}

interface ExpertSettings {
  minContrast: number;
  maxContrast: number;
  saturationRange: [number, number];
  lightnessRange: [number, number];
  colorHarmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'all';
}

// Color utility functions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(value => {
    value /= 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return rs * 0.2126 + gs * 0.7152 + bs * 0.0722;
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getWCAGLevel(ratio: number, isLargeText: boolean = false): 'AAA' | 'AA' | 'Fail' {
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'Fail';
  }
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}

function generateRandomColor(): string {
  // Generate more vibrant colors by using HSL
  const h = Math.random() * 360; // Any hue
  const s = 60 + Math.random() * 40; // 60-100% saturation
  const l = 30 + Math.random() * 40; // 30-70% lightness
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function generateAccessiblePalette(baseColor: string, harmonyType: string = 'all'): ColorCombination[] {
  const combinations: ColorCombination[] = [];
  const baseRgb = hexToRgb(baseColor);
  const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
  
  // More Coolors.co-style approach - create a cohesive palette first
  let colorPalette: string[] = [];
  
  // First, let's create a palette based on the harmony type
  switch (harmonyType) {
    case 'complementary':
      // Base color + variations + complementary + variations
      colorPalette = createComplementaryPalette(baseHsl);
      break;
    
    case 'analogous':
      // Base color + adjacent colors with variations
      colorPalette = createAnalogousPalette(baseHsl);
      break;
      
    case 'triadic':
      // Base color + two colors evenly spaced on the color wheel
      colorPalette = createTriadicPalette(baseHsl);
      break;
      
    case 'split-complementary':
      // Base color + colors adjacent to the complement
      colorPalette = createSplitComplementaryPalette(baseHsl);
      break;
      
    case 'all':
    default:
      // Mix of techniques based on the base color
      colorPalette = createMixedPalette(baseHsl);
      break;
  }
  
  // Limit to 5 colors max like Coolors.co
  colorPalette = colorPalette.slice(0, 5);
  
  // Make sure the base color is always first in the palette
  // First, check if the base color is already in the palette
  const baseColorHex = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b);
  if (!colorPalette.includes(baseColorHex)) {
    // If not, add it to the beginning
    colorPalette.unshift(baseColorHex);
    // Keep the palette limited to 5 colors
    colorPalette = colorPalette.slice(0, 5);
  } else {
    // If it exists, move it to the front
    const index = colorPalette.indexOf(baseColorHex);
    if (index > 0) {
      colorPalette.splice(index, 1);
      colorPalette.unshift(baseColorHex);
    }
  }
  
  // Now generate accessible combinations using the palette
  for (let i = 0; i < colorPalette.length; i++) {
    const bgColor = colorPalette[i];
    const bgRgb = hexToRgb(bgColor);
    const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    
    // Test with white text
    const whiteLuminance = 1; // White has luminance of 1
    const whiteContrast = getContrastRatio(whiteLuminance, bgLuminance);
    
    // Test with black text
    const blackLuminance = 0; // Black has luminance of 0
    const blackContrast = getContrastRatio(blackLuminance, bgLuminance);
    
    // Use the better contrast option
    const textColor = whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
    const ratio = Math.max(whiteContrast, blackContrast);
    
    // Determine WCAG level
    const wcagLevel = getWCAGLevel(ratio);
    
    // If it's the first one (index 0), always mark it as "Base" regardless of other factors
    let name = i === 0 ? "Base" : determineColorName(baseHsl, bgHsl, harmonyType);
    
    // Add to combinations
    combinations.push({
      background: bgColor,
      text: textColor,
      name,
      ratio,
      wcagLevel,
      // Flag to indicate this is the base color (for highlighting in UI)
      isBaseColor: i === 0
    });
  }
  
  // First, make sure the base color is always at the front of the array, 
  // regardless of its WCAG level or contrast ratio
  const baseColorCombo = combinations.find(combo => combo.isBaseColor);
  const otherCombos = combinations.filter(combo => !combo.isBaseColor);
  
  // Sort other combinations by WCAG level (AAA first, then AA, then fails)
  const sortedOtherCombos = otherCombos.sort((a, b) => {
    if (a.wcagLevel !== b.wcagLevel) {
      if (a.wcagLevel === 'AAA') return -1;
      if (b.wcagLevel === 'AAA') return 1;
      if (a.wcagLevel === 'AA') return -1;
      if (b.wcagLevel === 'AA') return 1;
    }
    return b.ratio - a.ratio;
  });
  
  // Place the base color at the start of the array
  return baseColorCombo ? [baseColorCombo, ...sortedOtherCombos] : sortedOtherCombos;
}

// Helper functions to create color palettes similar to Coolors.co

function createComplementaryPalette(baseHsl: { h: number, s: number, l: number }): string[] {
  const palette: string[] = [];
  const complementaryHue = (baseHsl.h + 180) % 360;
  
  // Add variations of the base color
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, Math.max(baseHsl.l - 15, 10)));
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, Math.min(baseHsl.l + 15, 90)));
  
  // Add complementary color and variation
  palette.push(hslToHexString(complementaryHue, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(complementaryHue, baseHsl.s, Math.max(baseHsl.l - 15, 10)));
  
  return palette;
}

function createAnalogousPalette(baseHsl: { h: number, s: number, l: number }): string[] {
  const palette: string[] = [];
  
  // Create a smooth progression of analogous colors
  palette.push(hslToHexString((baseHsl.h - 30 + 360) % 360, baseHsl.s, baseHsl.l + 5));
  palette.push(hslToHexString((baseHsl.h - 15 + 360) % 360, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString((baseHsl.h + 15) % 360, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString((baseHsl.h + 30) % 360, baseHsl.s, baseHsl.l - 5));
  
  return palette;
}

function createTriadicPalette(baseHsl: { h: number, s: number, l: number }): string[] {
  const palette: string[] = [];
  const triadicHue1 = (baseHsl.h + 120) % 360;
  const triadicHue2 = (baseHsl.h + 240) % 360;
  
  // Base color and variations
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, baseHsl.l));
  
  // First triadic color and variations
  palette.push(hslToHexString(triadicHue1, baseHsl.s, Math.min(baseHsl.l + 10, 90)));
  palette.push(hslToHexString(triadicHue1, baseHsl.s - 10, baseHsl.l));
  
  // Second triadic color and variations
  palette.push(hslToHexString(triadicHue2, baseHsl.s, Math.max(baseHsl.l - 10, 10)));
  palette.push(hslToHexString(triadicHue2, baseHsl.s - 10, baseHsl.l));
  
  return palette;
}

function createSplitComplementaryPalette(baseHsl: { h: number, s: number, l: number }): string[] {
  const palette: string[] = [];
  const complementaryHue = (baseHsl.h + 180) % 360;
  const splitComp1 = (complementaryHue - 30 + 360) % 360;
  const splitComp2 = (complementaryHue + 30) % 360;
  
  // Base color
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(baseHsl.h, baseHsl.s - 10, Math.min(baseHsl.l + 15, 90)));
  
  // Split complementary colors
  palette.push(hslToHexString(splitComp1, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(splitComp2, baseHsl.s, baseHsl.l));
  palette.push(hslToHexString(complementaryHue, baseHsl.s - 5, baseHsl.l - 5));
  
  return palette;
}

function createMixedPalette(baseHsl: { h: number, s: number, l: number }): string[] {
  const palette: string[] = [];
  
  // Base color
  palette.push(hslToHexString(baseHsl.h, baseHsl.s, baseHsl.l));
  
  // Analogous
  palette.push(hslToHexString((baseHsl.h + 30) % 360, baseHsl.s, baseHsl.l - 10));
  
  // Split complementary
  const complementaryHue = (baseHsl.h + 180) % 360;
  palette.push(hslToHexString((complementaryHue - 30 + 360) % 360, baseHsl.s - 5, baseHsl.l + 5));
  
  // Triadic
  palette.push(hslToHexString((baseHsl.h + 120) % 360, baseHsl.s - 10, baseHsl.l + 10));
  
  // Complementary
  palette.push(hslToHexString(complementaryHue, baseHsl.s, baseHsl.l));
  
  return palette;
}

function hslToHexString(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function determineColorName(baseHsl: { h: number, s: number, l: number }, colorHsl: { h: number, s: number, l: number }, harmonyType: string): string {
  // Calculate hue difference
  const hueDiff = Math.abs(baseHsl.h - colorHsl.h);
  
  // Base color or variation
  if (hueDiff < 15) {
    if (Math.abs(baseHsl.l - colorHsl.l) < 5) {
      return 'Base';
    } else {
      return colorHsl.l > baseHsl.l ? 'Lighter Base' : 'Darker Base';
    }
  }
  
  // Check for complementary (180° away)
  if (Math.abs(hueDiff - 180) < 15) {
    return 'Complementary';
  }
  
  // Check for analogous (30° away)
  if (hueDiff <= 40) {
    return 'Analogous';
  }
  
  // Check for triadic (120° away)
  if (Math.abs(hueDiff - 120) < 15 || Math.abs(hueDiff - 240) < 15) {
    return 'Triadic';
  }
  
  // Check for split complementary
  if (Math.abs(hueDiff - 150) < 15 || Math.abs(hueDiff - 210) < 15) {
    return 'Split Complementary';
  }
  
  // If it doesn't match a specific relationship, use the harmony type
  return harmonyType.charAt(0).toUpperCase() + harmonyType.slice(1);
}

export function WCAGColorPalette() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [baseColor, setBaseColor] = useState('#1a365d');
  const [generatedPalette, setGeneratedPalette] = useState<ColorCombination[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExpertSettings, setShowExpertSettings] = useState(false);
  const [expertSettings, setExpertSettings] = useState<ExpertSettings>({
    minContrast: 4.5,
    maxContrast: 21,
    saturationRange: [60, 100],
    lightnessRange: [20, 80],
    colorHarmony: 'all'
  });
  const paletteRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const generateNewPalette = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newBaseColor = generateRandomColor();
      setBaseColor(newBaseColor);
      const newPalette = generateAccessiblePalette(newBaseColor, expertSettings.colorHarmony);
      setGeneratedPalette(newPalette);
      setIsGenerating(false);
    }, 500);
  };

  const handleBaseColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBaseColor(newColor);
    const newPalette = generateAccessiblePalette(newColor, expertSettings.colorHarmony);
    setGeneratedPalette(newPalette);
  };

  const getLevelBadgeColor = (level: 'AAA' | 'AA' | 'Fail') => {
    switch (level) {
      case 'AAA':
        return 'bg-green-100 text-green-800';
      case 'AA':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const exportToPDF = async () => {
    if (!paletteRef.current) return;
    
    const canvas = await html2canvas(paletteRef.current);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
    
    // Add color information
    let y = imgHeight * ratio + 10;
    generatedPalette.forEach(combo => {
      pdf.setFontSize(10);
      pdf.text(`${combo.name}:`, 10, y);
      pdf.text(`Background: ${combo.background}`, 20, y + 5);
      pdf.text(`Text: ${combo.text}`, 20, y + 10);
      pdf.text(`Contrast Ratio: ${combo.ratio.toFixed(2)}:1`, 20, y + 15);
      y += 20;
    });
    
    pdf.save('color-palette.pdf');
  };

  const exportToText = () => {
    const content = generatedPalette.map(combo => (
      `${combo.name}\n` +
      `Background: ${combo.background}\n` +
      `Text: ${combo.text}\n` +
      `Contrast Ratio: ${combo.ratio.toFixed(2)}:1\n` +
      `WCAG Level: ${combo.wcagLevel}\n\n`
    )).join('---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'color-palette.txt');
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            WCAG Color Palette Generator
          </h2>
          <p className="text-gray-600">
            Generate accessible color combinations that meet WCAG 2.1 contrast requirements.
            Our algorithm creates diverse palettes using complementary, analogous, and triadic color harmonies.
          </p>
        </div>

        {isGenerating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <LoadingSpinner size="large" className="mb-4" />
              <p className="text-gray-900 font-medium">Generating Color Palette...</p>
            </div>
          </div>
        )}

        {/* Generator Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <div className="flex items-center justify-between">
              <span>Generate Custom Palette</span>
              <button
                onClick={() => setShowExpertSettings(!showExpertSettings)}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-5 h-5 mr-2" />
                Expert Settings
              </button>
            </div>
          </h3>
          
          {showExpertSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">Expert Color Settings</h4>
                <button
                  onClick={() => setShowExpertSettings(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrast Range
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="21"
                      step="0.1"
                      value={expertSettings.minContrast}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        minContrast: parseFloat(e.target.value)
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      max="21"
                      step="0.1"
                      value={expertSettings.maxContrast}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        maxContrast: parseFloat(e.target.value)
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Harmony
                  </label>
                  <select
                    value={expertSettings.colorHarmony}
                    onChange={(e) => setExpertSettings(prev => ({
                      ...prev,
                      colorHarmony: e.target.value as ExpertSettings['colorHarmony']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Harmonies</option>
                    <option value="complementary">Complementary</option>
                    <option value="analogous">Analogous</option>
                    <option value="triadic">Triadic</option>
                    <option value="split-complementary">Split Complementary</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saturation Range (%)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={expertSettings.saturationRange[0]}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        saturationRange: [parseInt(e.target.value), prev.saturationRange[1]]
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={expertSettings.saturationRange[1]}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        saturationRange: [prev.saturationRange[0], parseInt(e.target.value)]
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lightness Range (%)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={expertSettings.lightnessRange[0]}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        lightnessRange: [parseInt(e.target.value), prev.lightnessRange[1]]
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={expertSettings.lightnessRange[1]}
                      onChange={(e) => setExpertSettings(prev => ({
                        ...prev,
                        lightnessRange: [prev.lightnessRange[0], parseInt(e.target.value)]
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="baseColor" className="block text-sm font-medium text-gray-700 mb-2">
                Base Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  id="baseColor"
                  value={baseColor}
                  onChange={handleBaseColorChange}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => {
                    const newColor = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                      setBaseColor(newColor);
                      const newPalette = generateAccessiblePalette(newColor, expertSettings.colorHarmony);
                      setGeneratedPalette(newPalette);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#000000"
                />
              </div>
            </div>
            <button
              onClick={generateNewPalette}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate Random
            </button>
          </div>
        </div>

        {/* Generated Palette */}
        {generatedPalette.length > 0 ? (
          <>
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={exportToText}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="w-5 h-5 mr-2" />
              Export as Text
            </button>
            <button
              onClick={exportToPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileDown className="w-5 h-5 mr-2" />
              Export as PDF
            </button>
          </div>
          <div ref={paletteRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedPalette.map((combo, index) => (
              <div
                key={`${combo.background}-${combo.text}-${index}`}
                className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                  combo.isBaseColor ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div
                  style={{ backgroundColor: combo.background }}
                  className="h-32 p-4 flex items-center justify-center"
                >
                  <p style={{ color: combo.text }} className="text-lg font-medium">
                    Sample Text
                  </p>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium ${combo.isBaseColor ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                      {combo.isBaseColor ? (
                        <div className="flex items-center">
                          <span className="mr-1">🔍</span> {combo.name} Color
                        </div>
                      ) : (
                        combo.name
                      )}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(
                        combo.wcagLevel
                      )}`}
                    >
                      {combo.wcagLevel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded mr-2"
                          style={{ backgroundColor: combo.background }}
                        />
                        <span className="text-sm text-gray-600">Background</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(combo.background)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                      >
                        {copiedColor === combo.background ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        {combo.background}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded mr-2"
                          style={{ backgroundColor: combo.text }}
                        />
                        <span className="text-sm text-gray-600">Text</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(combo.text)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                      >
                        {copiedColor === combo.text ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        {combo.text}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Info className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-600">Contrast</span>
                      </div>
                      <span className="text-sm text-gray-900 font-medium">
                        {combo.ratio.toFixed(2)}:1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
          </>
        ) : (
          <EmptyState
            title="No Color Palette Generated"
            description="Generate a new color palette to see accessible color combinations"
            icon={<Palette className="h-6 w-6 text-gray-600" />}
            action={{
              label: 'Generate Palette',
              onClick: generateNewPalette
            }}
          />
        )}

        {/* Usage Guidelines */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Usage Guidelines
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Color Contrast</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>AAA level requires 7:1 contrast ratio for normal text</li>
                <li>AA level requires 4.5:1 contrast ratio for normal text</li>
                <li>Large text (18pt+) requires 3:1 for AA, 4.5:1 for AAA</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Use sufficient contrast for all text elements</li>
                <li>Test colors under different lighting conditions</li>
                <li>Consider color blindness when choosing combinations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}