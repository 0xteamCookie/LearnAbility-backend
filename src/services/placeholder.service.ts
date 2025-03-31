import { Request, Response } from 'express';

export interface PlaceholderOptions {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  border?: boolean;
  borderColor?: string;
}

export class PlaceholderService {
  generateSVG(options: PlaceholderOptions): string {
    const width = options.width || 300;
    const height = options.height || 150;
    const text = options.text || `${width}×${height}`;
    const bgColor = options.bgColor || '#e0e0e0';
    const textColor = options.textColor || '#555555';
    const fontSize = options.fontSize || Math.floor(Math.min(width, height) / 10);
    const border = options.border ?? false;
    const borderColor = options.borderColor || '#cccccc';

    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" />`;

    if (border) {
      svg += `
  <rect width="${width - 2}" height="${
        height - 2
      }" x="1" y="1" fill="none" stroke="${borderColor}" stroke-width="1" />`;
    }

    svg += `
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
    fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;

    return svg;
  }
}

export default new PlaceholderService();
