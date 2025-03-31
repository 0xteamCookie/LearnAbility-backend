# Learnability Backend

## Overview

Learnability Backend is a robust backend application designed to power an engaging and personalized educational platform. It provides a comprehensive suite of features for content creation, management, and user progress tracking, making it an ideal foundation for building modern learning experiences.

## Key Features

*   **User Authentication:** Secure user registration, login, and profile management with JWT.
*   **Subject Management:** Create, organize, and manage educational subjects as the foundation of your learning structure.
*   **Material Uploads:** Support for various learning materials (PDFs, images, text, etc.), allowing for diverse and rich content.
*   **Lesson Generation:** Automatic lesson creation based on syllabus documents, streamlining the content development process.
*   **Detailed Lesson Content:** Generation of comprehensive lesson content with multiple pages and blocks, including headings, text, code, quizzes, and more.
*   **Quiz Generation & Management:** Create, edit, and manage quizzes, including the generation of quiz questions with various types and difficulty levels.
*   **User Progress Tracking:** Comprehensive tracking of user learning, including study streaks, completed lessons, weekly progress, and quiz performance.
*   **AI-Powered Content Creation:** Leverage the power of Google's Gemini AI for:
    *   Text extraction from documents.
    *   Lesson content generation from syllabus documents.
    *   Detailed lesson creation.
    *   Quiz question generation.
*   **Vector Search:**  Semantic search capabilities powered by Milvus, allowing for contextually relevant content discovery.
*   **RESTful API:** A fully-featured RESTful API to interact with all aspects of the platform.

## Technologies Used

*   **TypeScript:** For type-safe development.
*   **Express.js:**  Web framework for building the API.
*   **Prisma:** ORM for database interactions.
*   **JWT (JSON Web Tokens):** For user authentication and authorization.
*   **Google Vertex AI (Gemini):** For AI-powered content generation.
*   **Milvus:** Vector database for semantic search.

## API Documentation

The application has an extensive API that allows you to use all the features. Please check the documentation that is generated after running the project.

### Endpoints:

*   **Auth (`/api/v1/auth`):**
    *   `POST /register` - User registration.
    *   `POST /login` - User login.
    *   `POST /logout` - User logout.
    *   `GET /me` - Get user profile.
*   **Stats (`/api/v1/stats`):**
    *   `GET /` - Get user learning stats.
    *   `POST /lesson/:lessonId/complete` - Mark a lesson as completed.
    *   `POST /track` - Track study activity.
    *   `POST /quiz` - Update quiz score.
*   **Pyos (Subjects, Sources, Lessons) (`/api/v1/pyos`):**
    *   `GET /subjects` - Get all subjects.
    *   `POST /subjects` - Create a new subject.
    *   `GET /subjects/:id` - Get a specific subject.
    *   `DELETE /subjects/:id` - Delete a subject.
    *   `POST /subjects/syllabus` - Upload a syllabus for a subject.
    *   `GET /subjects/:subjectId/syllabus` - Get the syllabus of a subject.
    *   `GET /subjects/:subjectId/lessons` - Generate lessons for a subject.
    *   `GET /:subjectId/:lessonId` - Generate detailed content for a lesson.
    * `GET /materials` - Get all Data Sources.
    * `GET /materials/:id` - Get a Data Source by Id.
    * `DELETE /materials/:id` - Delete a Data Source by Id.
    * `POST /materials` - Create a new Data Source.

*   **Quiz (`/api/v1/quiz`):**
    *   `GET /` - Get all quizzes.
    *   `GET /:id` - Get a specific quiz.
    *   `POST /` - Create a new quiz.
    *   `POST /generate` - Generate a new quiz.
    *   `DELETE /:id` - Delete a quiz.
    * `POST /:id/attempt` - Submit a Quiz attempt
    * `GET /:id/attempts` - Get Quiz attempts
*   **Analytics (`/api/v1/analytics`):**
    *   `GET /quizzes` - Get user quiz analytics.
    * `GET /quizzes/:id` - Get a specific quiz analytics
*   **Query (`/api/v1/query`):**
    *   `POST /` - Answer a user query using Milvus search.
* **Feed (`/api/v1/feed`):**
    *   `GET /` - Show the user feed.

## Setup and Installation

1.  **Clone the repository:**
```
bash
    git clone <repository-url>
    
```
2.  **Install dependencies:**
```
bash
    cd learnability-backend
    npm install
    
```
3.  **Environment Variables:**

    Create a `.env` file in the root directory and set the following environment variables:

    *   `JWT_SECRET`: A secret key for JWT encryption.
    *   `GOOGLE_CLOUD_PROJECT`: Your Google Cloud project ID.
    *   `DATABASE_URL`: Your database connection string.

4.  **Database Setup:**

    *   Ensure you have a compatible database running (e.g., PostgreSQL).
    *   Run Prisma migrations:
```
bash
    npx prisma migrate dev --name init
    
```
5.  **Milvus:**

    *   Make sure that you have Milvus running and accessible in `localhost:19530`.

6. **Run the application**
```
bash
    npm run dev
    
```
## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

[MIT](LICENSE)