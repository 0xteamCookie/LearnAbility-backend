import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import mime from 'mime-types';
interface Block {
  id: string;
  type: string;
  order: number;
  // You can add more properties as needed for each block type
  [key: string]: any;
}

interface Page {
  id: string;
  title: string;
  order: number;
  estimatedTime: string;
  blocks: Block[];
}

interface LessonContent {
  id: string;
  title: string;
  description: string;
  totalEstimatedTime: string;
  learningObjectives: string[];
  pages: Page[];
}
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
  console.log(`[GeminiService] Extracting text from document: ${filePath}`);
  try {
    if (!generativeModel) {
      console.error('[GeminiService] Gemini model not initialized during text extraction.');
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
      console.warn(
        `[GeminiService] No text was extracted from the response candidate for file: ${filePath}`
      );
    }
    console.log(`[GeminiService] Successfully extracted text from document: ${filePath}`);
    return extractedText;
  } catch (error) {
    console.error(`[GeminiService] Error processing document ${filePath} with Gemini:`, error);
    throw new Error(
      `[GeminiService] Failed to extract text from document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Process an image file (convenience method that calls extractTextFromDocument)
 */
export const extractTextFromImage = async (filePath: string): Promise<string> => {
  console.log(`[GeminiService] Extracting text from image (via document method): ${filePath}`);
  return extractTextFromDocument(filePath);
};

/**
 * Process a PDF file (convenience method that calls extractTextFromDocument)
 */
export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  console.log(`[GeminiService] Extracting text from PDF (via document method): ${filePath}`);
  return extractTextFromDocument(filePath);
};

export async function getEmbeddings(texts: string) {
  console.log(
    `[GeminiService] Generating embeddings for ${texts.split(';').length} text segments.`
  );
  const project = PROJECT_ID;
  const model = 'text-embedding-005';
  const task = 'QUESTION_ANSWERING';
  const dimensionality = 0;
  const apiEndpoint = 'us-central1-aiplatform.googleapis.com';
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
  console.log(`[GeminiService] Successfully generated ${embeddings.length} embedding(s).`);
  return embeddings[0];
}

/**
 * Generate detailed content for a lesson using Gemini
 * @param lessonId The ID of the lesson
 * @param title The title of the lesson
 * @param description The description of the lesson
 * @param targetLanguage The target language for content generation
 * @returns LessonContent object with detailed pages and blocks
 */
export const generateLessonContentSpecific = async (
  lessonId: string,
  title: string,
  description: string,
  targetLanguage: string = 'en'
): Promise<any> => {
  console.log(
    `[GeminiService] Generating specific lesson content for lesson: ${lessonId}, title: ${title}, language: ${targetLanguage}`
  );
  try {
    if (!generativeModel) {
      console.error(
        '[GeminiService] Gemini model not initialized during specific lesson generation.'
      );
      throw new Error('Gemini model not initialized');
    }

    const systemPrompt = `
    You are an expert educational content creator specializing in creating detailed, engaging lesson content.
    Generate a complete lesson content structure based on the title and description provided.
    The target language for ALL textual content (titles, descriptions, page content, block content, quiz questions, examples, etc.) is: ${targetLanguage}.
    
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
              
            },
            
          ]
        },
        
      ]
    }

    Create 3-5 pages with 5-10 blocks each, covering the lesson comprehensively.
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
    Ensure all generated text (titles, descriptions, content within blocks, quiz questions, options, explanations, etc.) is in ${targetLanguage}.
    `;

    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
      ],
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

    console.log(
      `[GeminiService] Successfully generated specific lesson content for lesson: ${lessonId}`
    );
    return lessonContent;
  } catch (error) {
    console.error(
      `[GeminiService] Error generating specific lesson content for lesson ${lessonId}:`,
      error
    );
    throw new Error(
      `[GeminiService] Failed to generate lesson content: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
// export const generateFullLessonContent = async (
//   lessonId: string,
//   title: string,
//   description: string,
//   maxPages: number = 5
// ): Promise<LessonContent> => {
//   console.log(
//     `[GeminiService] Generating full lesson content for lesson: ${lessonId}, title: ${title}`
//   );

//   if (!generativeModel) {
//     throw new Error('Gemini model not initialized');
//   }

//   // Initialize lesson content with types
//   let lessonContent: LessonContent = {
//     id: lessonId,
//     title,
//     description,
//     totalEstimatedTime: '',
//     learningObjectives: [],
//     pages: [],
//   };

//   let pageIndex = 1;
//   let done = false;
//   let maxAttempts = maxPages + 2; // Safety to avoid infinite loops

//   // Step 1: Generate learning objectives and totalEstimatedTime
//   const initialPrompt = `
// You are an expert educational content creator.
// Given the lesson title and description, generate ONLY the following fields as JSON:
// {
//   "totalEstimatedTime": "XX min",
//   "learningObjectives": ["objective 1", "objective 2", ...]
// }
// Title: "${title}"
// Description: "${description}"
// Do not include any other text.
//   `;

//   try {
//     const initialResult = await generativeModel.generateContent({
//       contents: [
//         {
//           role: 'user',
//           parts: [{ text: initialPrompt }],
//         },
//       ],
//       generationConfig: {
//         maxOutputTokens: 512,
//         temperature: 0.7,
//         topP: 0.95,
//       },
//     });

//     const initialText = initialResult.response.candidates[0].content.parts[0].text.trim();
//     const initialJson = JSON.parse(
//       initialText.substring(initialText.indexOf('{'), initialText.lastIndexOf('}') + 1)
//     );
//     lessonContent.totalEstimatedTime = initialJson.totalEstimatedTime;
//     lessonContent.learningObjectives = initialJson.learningObjectives;
//   } catch (error) {
//     throw new Error(
//       `[GeminiService] Failed to generate lesson objectives: ${
//         error instanceof Error ? error.message : String(error)
//       }`
//     );
//   }

//   // Step 2: Generate pages one by one
//   while (!done && pageIndex <= maxPages && maxAttempts-- > 0) {
//     // Build prompt with current lesson state (excluding blocks for brevity)
//     const contextPages = lessonContent.pages.map((p) => ({
//       id: p.id,
//       title: p.title,
//       order: p.order,
//     }));

//     const pagePrompt = `
// You are an expert educational content creator.
// Given the lesson so far (see below), generate the NEXT page for the lesson as a JSON object.
// - Do NOT repeat previous pages.
// - Use a variety of block types as described.
// - Ensure unique and descriptive IDs.
// - Include at least one quiz and one exercise in the whole lesson.
// - If all required content is covered, respond with "DONE" (as plain text, not JSON).

// Lesson so far:
// {
//   "id": "${lessonId}",
//   "title": "${title}",
//   "description": "${description}",
//   "totalEstimatedTime": "${lessonContent.totalEstimatedTime}",
//   "learningObjectives": ${JSON.stringify(lessonContent.learningObjectives)},
//   "pages": ${JSON.stringify(contextPages, null, 2)}
// }

// Generate page ${pageIndex} as:
// {
//   "id": "${lessonId}-page-${pageIndex}",
//   "title": "Page Title",
//   "order": ${pageIndex},
//   "estimatedTime": "X min",
//   "blocks": [
//     // 5-10 blocks, use a variety of types as described in the original prompt
//   ]
// }

// Do not include any text or explanation outside the JSON format, unless you are done, in which case respond with "DONE".
//     `;

//     try {
//       const result = await generativeModel.generateContent({
//         contents: [
//           {
//             role: 'user',
//             parts: [{ text: pagePrompt }],
//           },
//         ],
//         generationConfig: {
//           maxOutputTokens: 2048,
//           temperature: 0.7,
//           topP: 0.95,
//         },
//       });

//       const responseText = result.response.candidates[0].content.parts[0].text.trim();
//       console.log(responseText);

//       if (responseText === 'DONE') {
//         done = true;
//         break;
//       }

//       // Parse and append the new page
//       const jsonStart = responseText.indexOf('{');
//       const jsonEnd = responseText.lastIndexOf('}') + 1;
//       if (jsonStart === -1 || jsonEnd === 0) {
//         throw new Error('Invalid JSON response format for page');
//       }
//       const pageJson = JSON.parse(responseText.substring(jsonStart, jsonEnd)) as Page;
//       lessonContent.pages.push(pageJson);
//       pageIndex++;
//     } catch (error) {
//       throw new Error(
//         `[GeminiService] Failed to generate page ${pageIndex}: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     }
//   }

//   // Final validation: Ensure at least one quiz and one exercise exist
//   const allBlocks: Block[] = lessonContent.pages.flatMap((p) => p.blocks);
//   const hasQuiz = allBlocks.some((b) => b.type === 'quiz');
//   const hasExercise = allBlocks.some((b) => b.type === 'exercise');
//   if (!hasQuiz || !hasExercise) {
//     throw new Error(`[GeminiService] Generated lesson is missing a quiz or exercise.`);
//   }

//   console.log(`[GeminiService] Successfully generated full lesson content for lesson: ${lessonId}`);
//   return lessonContent;
// };
// Main function
export const generateFullLessonContent = async (
  lessonId: string,
  title: string,
  description: string,
  maxPages: number = 5
): Promise<LessonContent> => {
  if (!generativeModel) {
    throw new Error('Gemini model not initialized');
  }

  let lessonContent: LessonContent = {
    id: lessonId,
    title,
    description,
    totalEstimatedTime: '',
    learningObjectives: [],
    pages: [],
  };

  let pageIndex = 1;
  let done = false;
  let maxAttempts = maxPages + 2;

  // Step 1: Generate learning objectives and totalEstimatedTime
  const initialPrompt = `
You are an expert educational content creator.
Given the lesson title and description, return ONLY a valid, minified JSON object with the following fields:
{
  "totalEstimatedTime": "XX min",
  "learningObjectives": ["objective 1", "objective 2", ...]
}
Strict rules:
- Do NOT include any markdown, code fences, or extra text.
- Do NOT include comments or trailing commas.
- Do NOT include any explanation or text outside the JSON object.
- Return the JSON in a single line, without line breaks or spaces.
Title: "${title}"
Description: "${description}"
`;

  try {
    const initialResult = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: initialPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const initialText = initialResult.response.candidates[0].content.parts[0].text.trim();
    // No code fences, so just parse
    const initialJson = JSON.parse(initialText);
    lessonContent.totalEstimatedTime = initialJson.totalEstimatedTime;
    lessonContent.learningObjectives = initialJson.learningObjectives;
  } catch (error) {
    throw new Error(
      `[GeminiService] Failed to generate lesson objectives: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Step 2: Generate pages one by one
  while (!done && pageIndex <= maxPages && maxAttempts-- > 0) {
    const contextPages = lessonContent.pages.map((p) => ({
      id: p.id,
      title: p.title,
      order: p.order,
    }));

    const pagePrompt = `
You are an expert educational content creator.
Given the lesson so far (see below), return ONLY a valid, minified JSON object for the NEXT page.
Strict rules:
- Do NOT repeat previous pages.
- Use a variety of block types as described.
- Ensure unique and descriptive IDs.
- Include at least one quiz and one exercise in the whole lesson.
- If all required content is covered, respond with "DONE" (as plain text, not JSON).
- Do NOT include any markdown, code fences, or extra text.
- Do NOT include comments or trailing commas.
- Do NOT include any explanation or text outside the JSON object.
- Return the JSON in a single line, without line breaks or spaces.

Lesson so far:
{
  "id": "${lessonId}",
  "title": "${title}",
  "description": "${description}",
  "totalEstimatedTime": "${lessonContent.totalEstimatedTime}",
  "learningObjectives": ${JSON.stringify(lessonContent.learningObjectives)},
  "pages": ${JSON.stringify(contextPages)}
}

Generate page ${pageIndex} as:
{
  "id": "${lessonId}-page-${pageIndex}",
  "title": "Page Title",
  "order": ${pageIndex},
  "estimatedTime": "X min",
  "blocks": [
    // 5-10 blocks, use a variety of types as described in the original prompt
  ]
}
`;

    try {
      const result = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: pagePrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const responseText = result.response.candidates[0].content.parts[0].text.trim();
      console.log(responseText);
      if (responseText === 'DONE') {
        done = true;
        break;
      }

      // Parse and append the new page
      const pageJson = JSON.parse(responseText) as Page;
      lessonContent.pages.push(pageJson);
      pageIndex++;
    } catch (error) {
      throw new Error(
        `[GeminiService] Failed to generate page ${pageIndex}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Final validation: Ensure at least one quiz and one exercise exist
  const allBlocks: Block[] = lessonContent.pages.flatMap((p) => p.blocks);
  const hasQuiz = allBlocks.some((b) => b.type === 'quiz');
  const hasExercise = allBlocks.some((b) => b.type === 'exercise');
  if (!hasQuiz || !hasExercise) {
    throw new Error(`[GeminiService] Generated lesson is missing a quiz or exercise.`);
  }

  return lessonContent;
};

// const lesson = generateFullLessonContent(
//   'lesson-123',
//   'Introduction to TypeScript',
//   'Learn the basics of TypeScript, a typed superset of JavaScript.',
//   8
// );
// console.log(JSON.stringify(lesson, null, 2));

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
  console.log(
    `[GeminiService] Generating lesson content from syllabus: ${syllabusPath} for subject: ${subjectId}`
  );
  try {
    if (!generativeModel) {
      console.error(
        '[GeminiService] Gemini model not initialized during syllabus lesson generation.'
      );
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

    console.log(
      `[GeminiService] Successfully generated ${lessons.length} lessons from syllabus: ${syllabusPath}`
    );
    return lessons;
  } catch (error) {
    console.error(
      `[GeminiService] Error generating lessons from syllabus ${syllabusPath} with Gemini:`,
      error
    );
    throw new Error(
      `[GeminiService] Failed to generate lessons: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// New function for translating a map of texts
export const translateTextMap = async (
  textsToTranslate: Record<string, string>,
  targetLanguageCode: string,
  sourceLanguageCode: string = 'en' // Assuming source is English by default
): Promise<Record<string, string>> => {
  console.log(
    `[GeminiService] Translating texts to ${targetLanguageCode}. Input keys: ${Object.keys(
      textsToTranslate
    ).join(', ')}`
  );
  if (!generativeModel) {
    console.error('[GeminiService] Gemini model not initialized during text map translation.');
    throw new Error('Gemini model not initialized');
  }

  const inputText = JSON.stringify(textsToTranslate, null, 2);

  // Prepare a more detailed prompt for translation
  const systemPrompt = `You are an expert language translator.\nYour task is to translate the values of the provided JSON object from ${sourceLanguageCode} to ${targetLanguageCode}.\n\nIMPORTANT RULES:\n1.  Translate ONLY the string values of the JSON object.\n2.  Keep ALL JSON keys exactly as they are in the input.\n3.  The output MUST be a single, valid JSON object.\n4.  Do NOT include any markdown, code fences (like \`\`\`json), comments, or any explanatory text outside the JSON object itself.\n5.  Ensure the output JSON is minified (no unnecessary whitespace or newlines).\n6.  If a value cannot be meaningfully translated (e.g., it\'s a placeholder like "{{name}}"), keep the original value.\n\nInput JSON object to translate:\n${inputText}\n\nTranslated JSON object in ${targetLanguageCode}:\n`;

  try {
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        // Adjust generationConfig as needed for translation tasks
        maxOutputTokens: 8192, // Ensure this is enough for your largest JSON
        temperature: 0.3,      // Lower temperature for more deterministic translation
        topP: 0.95,
        // responseMimeType: "application/json", // If supported and reliable for this model version
      },
    });

    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || !response.candidates[0].content.parts[0].text) {
      console.error('[GeminiService] Invalid or empty response structure from Gemini API:', JSON.stringify(response, null, 2));
      throw new Error('Invalid or empty response from Gemini API during translation.');
    }

    let responseText = response.candidates[0].content.parts[0].text.trim();
    console.log('[GeminiService] Raw Gemini Response:\n', responseText);

    // Attempt to clean the response to ensure it's valid JSON
    // Remove potential markdown and ensure it starts with { and ends with }
    if (responseText.startsWith('```json')) {
      responseText = responseText.substring(7);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.substring(0, responseText.length - 3);
    }
    responseText = responseText.trim();

    // Sometimes the model might still wrap the JSON or add minor text, so we try to find the JSON block
    let jsonStart = responseText.indexOf('{');
    let jsonEnd = responseText.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      console.error('[GeminiService] Could not find valid JSON object in Gemini response. Response was:', responseText);
      throw new Error('Could not find valid JSON object in Gemini response.');
    }

    const jsonStr = responseText.substring(jsonStart, jsonEnd);
    
    const translatedData = JSON.parse(jsonStr);

    console.log(
      `[GeminiService] Successfully translated texts to ${targetLanguageCode}. Output keys: ${Object.keys(
        translatedData
      ).join(', ')}`
    );
    return translatedData;
  } catch (error: any) {
    console.error(
      `[GeminiService] Error translating text map to ${targetLanguageCode}:`,
      error
    );
    // Check if the error is from JSON.parse and include the problematic string
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      throw new Error(
        `[GeminiService] Failed to parse translated JSON response from Gemini. Raw response was: ${error.message}. Text: ${error.stack?.substring(0,500)}`
      );
    } else {
        throw new Error(
            `[GeminiService] Failed to translate text map: ${
            error instanceof Error ? error.message : String(error)
            }`
        );
    }
  }
};
