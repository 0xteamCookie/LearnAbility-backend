import { Request, Response } from 'express';
import db from '../db/db';
import { VertexAI } from '@google-cloud/vertexai';

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

export const showUserFeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return void res.status(500).json({
        success: false,
        message: 'User not found.',
      });
    }
    if (!generativeModel) {
      return void res.status(500).json({
        success: false,
        message: 'Gemini model not initialized',
      });
    }
    const systemPrompt = `
  You are a helpful AI tutor designed to assist students in learning effectively.  
  Based on the provided context—including the student's interests, academic standard, and syllabus—generate a list of high-quality educational resources.  

  Your response **must be a valid JSON object**

  - Ensure all URLs are real or indicate they are placeholders.
  - Do **not** include extra text or explanations outside the JSON format.
`;

    const contextText = {
      standard: user.standard,
      interests: user.interests,
    };
    console.log(contextText);
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nContext:\n${contextText}\n\nTask: Give me content for my feed atleast 10`,
            },
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
