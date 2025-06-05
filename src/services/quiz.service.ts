import { VertexAI } from '@google-cloud/vertexai';
import db from '../db/db';
import { updateQuizAverage } from './stats.service';

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
 * Generate a quiz based on a subject
 */
export const generateQuiz = async (
  subjectId: string,
  options: {
    lessonId?: string;
    difficulty?: string;
    questionCount?: number;
    title?: string;
    description?: string;
  } = {}
): Promise<any> => {
  try {
    if (!generativeModel) {
      throw new Error('Gemini model not initialized');
    }

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        dataSources: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            content: true,
          },
          take: 5,
        },
      },
    });

    if (!subject) {
      throw new Error('Subject not found');
    }

    let lesson = null;
    if (options.lessonId) {
      lesson = await db.lesson.findUnique({
        where: { id: options.lessonId },
      });
    }

    let contextContent = '';
    if (subject.dataSources && subject.dataSources.length > 0) {
      contextContent = subject.dataSources
        .filter((ds) => ds.content)
        .map((ds) => ds.content)
        .join('\n\n')
        .substring(0, 10000);
    }

    const systemPrompt = `
    You are an expert educational content creator specializing in creating high-quality quiz questions.
    Based on the provided subject ${subject.name}${lesson ? ` and lesson ${lesson.title}` : ''}, 
    generate a quiz with ${options.questionCount || 10} questions.
    
    The quiz should be at ${options.difficulty || 'Medium'} difficulty level.
    
    The response must be a valid JSON object following EXACTLY this structure:
    {
      "title": "${options.title || `${subject.name} Quiz`}",
      "description": "${options.description || `Test your knowledge of ${subject.name}`}",
      "difficulty": "${options.difficulty || 'Medium'}",
      "timeLimit": 30,
      "passingScore": 70,
      "questions": [
        {
          "id": "q1",
          "content": "Question text goes here?",
          "type": "multiple-choice", 
          "difficulty": "Medium", 
          "points": 10,
          "explanation": "Explanation of the correct answer",
          "answers": [
            {
              "id": "a1",
              "content": "Answer option 1",
              "isCorrect": false,
              "explanation": "Why this answer is incorrect (optional)"
            },
            {
              "id": "a2",
              "content": "Answer option 2",
              "isCorrect": true,
              "explanation": "Why this answer is correct (optional)"
            },
            
          ]
        },
        
      ]
    }
    
    Guidelines:
    - Create varied question types, with most being multiple-choice
    - For each multiple-choice question, include 3-4 plausible options with only one correct answer
    - For true-false questions, provide clear statements that are definitely true or false
    - For fill-in-the-blank questions, make sure the answer is specific and unambiguous
    - For essay questions, include evaluation criteria in the explanation
    - Make questions progressively more difficult throughout the quiz
    - Do not include any text or explanation outside the JSON format
    `;

    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nContext:\n${
                contextContent || 'Create a quiz based on general knowledge of this subject.'
              }`,
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
    const quizData = JSON.parse(jsonStr);

    quizData.questionCount = quizData.questions.length;

    return quizData;
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw new Error(
      `Failed to generate quiz: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Save a generated quiz to the database
 */
export const saveQuiz = async (
  quizData: any,
  userId: string,
  subjectId: string,
  lessonId?: string
): Promise<any> => {
  try {
    const quiz = await db.quiz.create({
      data: {
        title: quizData.title,
        description: quizData.description || '',
        difficulty: quizData.difficulty,
        questionCount: quizData.questions?.length || 0,
        timeLimit: quizData.timeLimit,
        passingScore: quizData.passingScore,
        questions: quizData.questions,
        attempts: [],
        userId,
        subjectId,
        lessonId: lessonId || null,
      },
    });

    return quiz;
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw new Error(
      `Failed to save quiz: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Record a quiz attempt
 */
export const recordQuizAttempt = async (
  quizId: string,
  userId: string,
  userAnswers: any[],
  startedAt: Date
): Promise<any> => {
  try {
    if (!generativeModel) {
      throw new Error('Gemini model not initialized');
    }

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const questions = quiz.questions as any[];
    let score = 0;
    let maxScore = 0;
    const feedbackPromises: Promise<any>[] = [];

    const scoredAnswers = userAnswers
      .map((userAnswer) => {
        const question = questions.find((q) => q.id === userAnswer.questionId);
        if (!question) return null;

        const questionPoints = question.points || 1;
        maxScore += questionPoints;
        let isCorrect = false;
        let pointsEarned = 0;
        let feedback: string | null = null;

        if (question.type === 'essay') {
          isCorrect = false;
          pointsEarned = 0;
        } else if (question.type === 'multiple-choice' || question.type === 'true-false') {
          const correctAnswer = question.answers.find((a: any) => a.isCorrect);
          if (correctAnswer && userAnswer.answerId === correctAnswer.id) {
            isCorrect = true;
            pointsEarned = questionPoints;
            score += questionPoints;
          }
        } else if (question.type === 'fill-blank') {
          const correctAnswer = question.answers.find((a: any) => a.isCorrect);
          if (
            correctAnswer &&
            userAnswer.text &&
            correctAnswer.content.toLowerCase().trim() === userAnswer.text.toLowerCase().trim()
          ) {
            isCorrect = true;
            pointsEarned = questionPoints;
            score += questionPoints;
          }
        }

        if (!isCorrect) {
          const correctAnswerDetail = question.answers.find((a: any) => a.isCorrect);
          const givenAnswerDetail = question.answers.find((a: any) => a.id === userAnswer.answerId);

          const prompt = `
          Analyze the following quiz question and the user's incorrect answer. Provide concise, helpful feedback explaining why the correct answer is right and potentially why the user's answer was wrong.

          Question: ${question.content}
          Options: ${JSON.stringify(question.answers.map((a: any) => a.content))}
          Correct Answer: ${correctAnswerDetail?.content || 'N/A'}
          User's Answer: ${givenAnswerDetail?.content || userAnswer.text || 'N/A'}
          Existing Explanation (if any): ${question.explanation || 'None'}

          Feedback:`;

          feedbackPromises.push(
            generativeModel
              .generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 200,
                  temperature: 0.5,
                },
              })
              .then((result: any) => {
                try {
                  const feedbackText =
                    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                    'Could not generate feedback.';
                  return { questionId: question.id, feedback: feedbackText };
                } catch (e) {
                  console.error(`Error processing Gemini feedback for question ${question.id}:`, e);
                  return { questionId: question.id, feedback: 'Error generating feedback.' };
                }
              })
              .catch((error: any) => {
                console.error(
                  `Error calling Gemini for feedback on question ${question.id}:`,
                  error
                );
                return { questionId: question.id, feedback: 'Error generating feedback.' };
              })
          );
        }

        return {
          questionId: question.id,
          givenAnswer: userAnswer.answerId || userAnswer.text || '',
          isCorrect,
          pointsEarned,
        };
      })
      .filter((answer): answer is NonNullable<typeof answer> => answer !== null);

    const attempt = {
      id: `attempt_${Date.now()}`,
      userId,
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      passed: maxScore > 0 ? (score / maxScore) * 100 >= quiz.passingScore : false,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      answers: scoredAnswers,
      feedback: [],
    };

    const feedbackResults = await Promise.all(feedbackPromises);
    const feedbackMap = new Map(feedbackResults.map((f) => [f.questionId, f.feedback]));

    attempt.answers = attempt.answers.map((ans) => ({
      ...ans,
      feedback: feedbackMap.get(ans.questionId) || null,
    }));

    let attempts = (quiz.attempts as any[]) || [];
    attempts.push(attempt);

    await db.quiz.update({
      where: { id: quizId },
      data: {
        attempts,
      },
    });

    await updateQuizAverage(userId, attempt.percentage);

    try {
      const userStats = await db.userStats.findUnique({
        where: { userId },
      });

      if (userStats) {
        await db.userStats.update({
          where: { userId },
          data: {
            quizAverage: {
              set: userStats.quizAverage
                ? (userStats.quizAverage + attempt.percentage) / 2
                : attempt.percentage,
            },
            lastStudiedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }

    return attempt;
  } catch (error) {
    console.error('Error recording quiz attempt:', error);
    throw new Error(
      `Failed to record quiz attempt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
