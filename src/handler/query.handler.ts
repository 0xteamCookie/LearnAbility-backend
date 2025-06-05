import { Request, Response } from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import { searchMilvus } from '../services/milvus';
import db from '../db/db';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'learnability-project';
const LOCATION = 'us-central1';
const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

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
    const { query, subjectId } = req.body;

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

    const searchOptions: {
      topK?: number;
      subjectId?: string;
      dataSourceIds?: string[];
    } = {
      topK: 3,
    };

    try {
      let dataSourceIds: string[] = [];
      if (subjectId) {
        console.log(`Searching for data sources in subject: ${subjectId}`);
        const whereClause: any = { userId, subjectId };

        const dataSources = await db.dataSource.findMany({
          where: whereClause,
          select: { id: true },
        });

        dataSourceIds = dataSources.map((ds) => ds.id);
        console.log(`Found ${dataSourceIds.length} data sources in this subject`);

        if (dataSourceIds.length > 0) {
          searchOptions.dataSourceIds = dataSourceIds;
        } else {
          console.log('No data sources found, falling back to subject ID search');
          searchOptions.subjectId = subjectId;
        }
      }

      console.log('Search options:', searchOptions);
      const contextChunks = await searchMilvus(query, userId, searchOptions);
      console.log(`Found ${contextChunks.length} context chunks`);

      if (contextChunks.length === 0) {
        return void res.status(200).json({
          success: true,
          answer: `I couldn't find any relevant information related to your question in the materials for this subject. Would you like to add more materials on this topic?`,
          query,
          relevanceScore: 0,
          subjectId: subjectId || null,
        });
      }

      const contextText = contextChunks.map((chunk) => chunk.text).join('\n\n');

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
        subjectId: subjectId || null,
      });
    } catch (searchError) {
      console.error('Error during search:', searchError);
      return void res.status(200).json({
        success: true,
        answer:
          "I'm having trouble searching through your materials right now. This could be because the vector database is still initializing or needs maintenance. Please try again in a few moments.",
        query,
        relevanceScore: 0,
        subjectId: subjectId || null,
      });
    }
  } catch (error) {
    console.error('Error answering user query:', error);
    return void res.status(500).json({
      success: false,
      message: 'Failed to answer query',
      error: (error as Error).message,
    });
  }
};
