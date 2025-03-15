import { Request, Response } from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import { searchMilvus } from '../services/milvus';

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
 * @desc Answer a user query using RAG with Milvus and Gemini
 * @route POST /api/v1/user-query
 * @protected
 */
export const answerUserQuery = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return void res.status(400).json({
        success: false,
        message: 'Query is required and must be a string',
      });
    }

    if (!generativeModel) {
      return void res.status(500).json({
        success: false,
        message: 'Gemini model not initialized',
      });
    }

    const contextChunks = await searchMilvus(query, userId, 2);
    console.log('Context:', contextChunks);

    const contextText = contextChunks.map((chunk: any) => chunk.text).join('\n\n');
    

    const systemPrompt = `
      You are a helpful AI tutor designed to help students learn. 
      Your knowledge comes from the provided context only.
      If the context doesn't contain enough information to fully answer the question, acknowledge what you know 
      from the context and suggest what additional information might be needed.
      Always be encouraging, clear, and explain concepts in a way that's easy to understand.
    `;

    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nContext:\n${contextText}\n\nUser Question: ${query}` },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
        //topK: 40,
      },
    });

    const response = result.response;
    if (!response || !response.candidates || response.candidates.length === 0) {
      return void res.status(500).json({
        success: false,
        message: 'No response generated from AI',
      });
    }

    const answer = response.candidates[0].content.parts[0].text;

    return void res.status(200).json({
      success: true,
      answer,
      query,
      relevanceScore: contextChunks.length > 0 ? contextChunks[0].score : 0,
    });
  } catch (error) {
    console.error('Error answering user query:', error);
    return void res.status(500).json({
      success: false,
      message: 'Failed to answer query',
      error: (error as Error).message,
    });
  }
};
