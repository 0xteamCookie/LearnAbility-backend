import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import mime from 'mime-types';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || '';
const LOCATION = 'europe-west4';
const MODEL_NAME = 'gemini-2.0-flash-lite-001';

let vertexAI: VertexAI;
let generativeModel: any;

try {
  vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  generativeModel = vertexAI.getGenerativeModel({ model: MODEL_NAME });
} catch (error) {
  console.error('Error initializing Vertex AI client:', error);
}

/**
 * Convert file to base64 for the generative model
 */
async function fileToGenerativePart(filePath: string) {
  const fileContent = await fs.readFile(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  return {
    inlineData: {
      data: fileContent.toString('base64'),
      mimeType,
    },
  };
}

/**
 * Extract text from any document using the Gemini model
 * @param filePath Path to the document file
 * @returns Extracted text content
 */
export const extractTextFromDocument = async (filePath: string): Promise<string> => {
  try {
    if (!generativeModel) {
      throw new Error('Gemini model not initialized');
    }

    const filePart = await fileToGenerativePart(filePath);

    const instructionText = `You are a document parser. Your task is to read the provided document and output all parsed content in plain text.
Ensure that any formulas in the document are accurately formatted. Additionally, structure the output to be AI data-ready,
as it will be ingested into a vector database. Provide efficient and comprehensive data.`;

    const promptParts = [{ text: instructionText }, filePart, { text: 'output' }];

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,

        responseModalities: ['TEXT'],
      },
    });

    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates returned');
    }

    let extractedText = '';
    if (response.candidates[0].content) {
      extractedText = response.candidates[0].content.parts[0].text;
    }

    if (!extractedText) {
      console.warn('No text was extracted from the response candidate.');
    }
    return extractedText;
  } catch (error) {
    console.error('Error processing document with Gemini:', error);
    throw new Error(
      `Failed to extract text from document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Process an image file (convenience method that calls extractTextFromDocument)
 */
export const extractTextFromImage = async (filePath: string): Promise<string> => {
  return extractTextFromDocument(filePath);
};

/**
 * Process a PDF file (convenience method that calls extractTextFromDocument)
 */
export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  return extractTextFromDocument(filePath);
};
