import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import fs from 'fs/promises';

let visionClient: ImageAnnotatorClient;

try {
  visionClient = new ImageAnnotatorClient();
} catch (error) {
  console.error('Error initializing Google Vision client:', error);
}

/**
 * Extract text from an image file using Google Vision API
 * @param filePath Path to the image file
 * @returns Extracted text content
 */
export const extractTextFromImage = async (filePath: string): Promise<string> => {
  try {
    const [result] = await visionClient.textDetection(filePath);
    const detections = result.textAnnotations;

    if (detections && detections.length > 0) {
      return detections[0].description || '';
    }

    return '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
};

/**
 * Extract text from a PDF document using Google Vision API
 * @param filePath Path to the PDF file
 * @returns Extracted text content
 */
export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  try {
    const fileContent = await fs.readFile(filePath);

    const inputConfig: protos.google.cloud.vision.v1.IInputConfig = {
      mimeType: 'application/pdf',
      content: fileContent.toString('base64'),
    };

    const features: protos.google.cloud.vision.v1.IFeature[] = [
      {
        type: protos.google.cloud.vision.v1.Feature.Type.DOCUMENT_TEXT_DETECTION,
      },
    ];

    const fileRequest: protos.google.cloud.vision.v1.IAnnotateFileRequest = {
      inputConfig,
      features,
    };

    const request: protos.google.cloud.vision.v1.IBatchAnnotateFilesRequest = {
      requests: [fileRequest],
    };

    const [result] = await visionClient.batchAnnotateFiles(request);

    let fullText = '';
    if (result.responses && result.responses[0].responses) {
      for (const response of result.responses[0].responses) {
        if (response.fullTextAnnotation) {
          fullText += response.fullTextAnnotation.text + '\n';
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};
