import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import mime from 'mime-types';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || '';
const LOCATION = 'us-central1';
const MODEL_NAME = 'gemini-2.0-pro-exp-02-05';

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

    const instructionText = `Your task is to read the data from the given file, extract all the informations and write it in a structured format, if there any images`;

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

export async function getEmbeddings(texts: string) {
  const project = PROJECT_ID;
  const model = 'text-embedding-005';
  const task = 'QUESTION_ANSWERING';
  const dimensionality = 0;
  const apiEndpoint = 'europe-west4-aiplatform.googleapis.com';
  const aiplatform = require('@google-cloud/aiplatform');
  const { PredictionServiceClient } = aiplatform.v1;
  const { helpers } = aiplatform;
  const clientOptions = { apiEndpoint: apiEndpoint };
  const location = 'us-central1';
  const endpoint = `projects/${project}/locations/${location}/publishers/google/models/${model}`;

  const instances = texts.split(';').map((e) => helpers.toValue({ content: e, task_type: task }));
  const parameters = helpers.toValue(
    dimensionality > 0 ? { outputDimensionality: dimensionality } : {}
  );
  const request = { endpoint, instances, parameters };
  const client = new PredictionServiceClient(clientOptions);
  const [response] = await client.predict(request);
  const predictions = response.predictions;
  const embeddings = predictions.map((p: any) => {
    const embeddingsProto = p.structValue.fields.embeddings;
    const valuesProto = embeddingsProto.structValue.fields.values;
    return valuesProto.listValue.values.map((v: any) => v.numberValue);
  });
  return embeddings[0];
}

/**
 * Generate detailed content for a lesson using Gemini
 * @param lessonId The ID of the lesson
 * @param title The title of the lesson
 * @param description The description of the lesson
 * @returns LessonContent object with detailed pages and blocks
 */
export const generateLessonContentSpecific = async (
  lessonId: string,
  title: string,
  description: string
): Promise<any> => {
  try {
    if (!generativeModel) {
      throw new Error('Gemini model not initialized');
    }

    const systemPrompt = `
    You are an expert educational content creator specializing in creating detailed, engaging lesson content.
    Generate a complete lesson content structure based on the title and description provided.
    
    The response must be a valid JSON object following EXACTLY this structure:
    {
      "id": "${lessonId}",
      "title": "${title}",
      "description": "${description}",
      "totalEstimatedTime": "XX min",
      "learningObjectives": ["objective 1", "objective 2", ...],
      "pages": [
        {
          "id": "${lessonId}-page-1",
          "title": "Page Title",
          "order": 1,
          "estimatedTime": "X min",
          "blocks": [
            {
              "id": "unique-block-id",
              "type": "heading|text|list|code|equation|callout|quiz|exercise|checkpoint|table|definition",
              "order": 1,
              // Additional properties based on block type
            },
            // More blocks...
          ]
        },
        // More pages...
      ]
    }

    Create 3-5 pages with 5-10 blocks each, covering the topic comprehensively.
    Use a variety of block types for engaging content:
    - heading: {level: 1-4, content: "heading text"}
    - text: {content: "paragraph text", emphasis: "none|light|strong"}
    - list: {items: ["item1", "item2"], style: "bullet|numbered|check"}
    - code: {content: "code snippet", language: "appropriate language", showLineNumbers: true/false}
    - equation: {content: "LaTeX equation", displayMode: true/false}
    - callout: {content: "callout text", variant: "info|warning|success|error", title: "optional title"}
    - quiz: {title: "quiz title", questions: [{id: "q1", question: "question text", options: ["opt1", "opt2", "opt3", "opt4"], correctAnswer: index, explanation: "why"}]}
    - exercise: {instructions: "what to do", startingCode: "optional", solution: "optional", hints: ["hint1", "hint2"]}
    - checkpoint: {title: "checkpoint title", description: "description", requiredToAdvance: true/false}
    - table: {headers: ["col1", "col2"], rows: [["data1", "data2"], ["data3", "data4"]], caption: "optional caption"}
    - definition: {term: "term to define", definition: "definition text", examples: ["example1", "example2"]}

    Ensure all IDs are unique and descriptive.
    Ensure proper content flow and learning progression across pages.
    Include at least one quiz and one exercise in the lesson.
    Do not include any text or explanation outside the JSON format.
    `;

    const result = await generativeModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ 
          text: systemPrompt
        }] 
      }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates returned');
    }

    const responseText = response.candidates[0].content.parts[0].text;

    let jsonStart = responseText.indexOf('{');
    let jsonEnd = responseText.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON response format');
    }

    const jsonStr = responseText.substring(jsonStart, jsonEnd);
    const lessonContent = JSON.parse(jsonStr);

    return lessonContent;
  } catch (error) {
    console.error('Error generating lesson content with Gemini:', error);
    throw new Error(
      `Failed to generate lesson content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Generate lesson content based on syllabus PDF
 * @param syllabusPath Path to the syllabus PDF file
 * @param subjectId The ID of the subject
 * @param subjectName The name of the subject
 * @returns Array of lesson objects
 */
export const generateLessonContent = async (
  syllabusPath: string,
  subjectId: string,
  subjectName: string
): Promise<any> => {
  try {
    if (!generativeModel) {
      throw new Error('Gemini model not initialized');
    }

    const filePart = await fileToGenerativePart(syllabusPath);

    const systemPrompt = `
    You are a helpful AI tutor designed to assist students in learning effectively.
    Based on the provided syllabus PDF, generate a list of 4-8 high-quality educational lessons.
    
    Your response must be a valid JSON array of lessons following EXACTLY this format:
    [
      {
        "id": "subject-shortened-title",
        "title": "Lesson Title",
        "description": "Brief description of the lesson content",
        "subjectId": "${subjectId}",
        "duration": "XX min",
        "level": "Beginner|Intermediate|Advanced",
        "order": 1,
        "progress": 0,
        "image": "/placeholder.svg?height=200&width=400",
        "prerequisites": []
      }
    ]
    
    For the first lesson, prerequisites should be an empty array.
    For subsequent lessons, prerequisites should include the IDs of lessons that should be completed first.
    The subject ID is provided to you and should be used as-is.
    Ensure lesson IDs are unique, descriptive, and kebab-cased (e.g., "math-linear-equations").
    Lesson order should be sequential and logical for learning progression.
    Lesson progress should be set to 0 for all lessons.
    Do not include any text or explanation outside the JSON format.
    `;

    const promptParts = [
      { text: systemPrompt },
      { text: `Subject Name: ${subjectName}` },
      filePart,
    ];

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates returned');
    }

    const responseText = response.candidates[0].content.parts[0].text;

    let jsonStart = responseText.indexOf('[');
    let jsonEnd = responseText.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON response format');
    }

    const jsonStr = responseText.substring(jsonStart, jsonEnd);
    const lessons = JSON.parse(jsonStr);

    return lessons;
  } catch (error) {
    console.error('Error generating lessons with Gemini:', error);
    throw new Error(
      `Failed to generate lessons: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};