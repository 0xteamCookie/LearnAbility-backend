import { Request, Response } from 'express';
import placeholderService from '../services/placeholder.service';

export class PlaceholderHandler {
  async getSVG(req: Request, res: Response): Promise<void> {
    try {
      const options = {
        width: req.query.width ? parseInt(req.query.width as string) : undefined,
        height: req.query.height ? parseInt(req.query.height as string) : undefined,
        text: req.query.text as string,
        bgColor: req.query.bgColor as string,
        textColor: req.query.textColor as string,
        fontSize: req.query.fontSize ? parseInt(req.query.fontSize as string) : undefined,
        border: req.query.border ? req.query.border === 'true' : undefined,
        borderColor: req.query.borderColor as string,
      };

      const svg = placeholderService.generateSVG(options);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(200).send(svg);
    } catch (error) {
      console.error('Error generating placeholder SVG:', error);
      res.status(500).send('Error generating SVG');
    }
  }
}
export default new PlaceholderHandler();
