# Learnability Backend API  
**Empowering Personalized Learning Experiences**

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
  - [🚀 User Management](#-user-management)
  - [📚 Content Management](#-content-management)
  - [🤖 AI-Powered Capabilities](#-ai-powered-capabilities)
  - [🔍 Search Capabilities](#-search-capabilities)
  - [⚙️ Other Features](#-other-features)
- [Technologies Used](#technologies-used)
- [API Documentation](#api-documentation)
- [Setup and Installation](#setup-and-installation)
- [License](#license)

---

## Overview
Learnability Backend API is a robust backend application designed to power an engaging and personalized educational platform. It offers comprehensive features for content creation, management, and user progress tracking—providing an ideal foundation for modern learning experiences.

---

## Key Features

### 🚀 User Management
- **User Authentication:** Secure registration, login, and profile management using JWT.
- **User Progress Tracking:** Monitor study streaks, completed lessons, weekly progress, and quiz performance.

### 📚 Content Management
- **Subject Management:** Organize and manage educational subjects.
- **Material Uploads:** Support for diverse materials (PDFs, images, text, etc.).
- **Lesson Generation:** Automatic lesson creation from syllabus documents.
- **Detailed Lesson Content:** Generate multi-page lesson content with headings, text, code, quizzes, and more.
- **Quiz Generation & Management:** Create and manage quizzes with varied question types and difficulty levels.

### 🤖 AI-Powered Capabilities
- **Content Creation:** Leverage Google's Gemini AI for:
  - Extracting text from documents.
  - Generating lesson content from syllabi.
  - Creating detailed lesson plans.
  - Producing quiz questions.

### 🔍 Search Capabilities
- **Vector Search:** Semantic search powered by Milvus for contextually relevant content discovery.

### ⚙️ Other Features
- **RESTful API:** Fully-featured API to interact with every aspect of the platform.

---

## Technologies Used

- **TypeScript:** Type-safe development.
- **Express.js:** Web framework for building the API.
- **Prisma:** ORM for database interactions.
- **JWT:** Secure authentication and authorization.
- **Google Vertex AI (Gemini):** AI-powered content generation.
- **Milvus:** Vector database for semantic search.

---

## API Documentation

### Endpoints Overview

#### Auth (`/api/v1/auth`)
- `POST /register` — Register a new user.
- `POST /login` — User login.
- `POST /logout` — Logout.
- `GET /me` — Retrieve user profile.

#### Stats (`/api/v1/stats`)
- `GET /` — Retrieve user learning stats.
- `POST /lesson/:lessonId/complete` — Mark a lesson as completed.
- `POST /track` — Track study activity.
- `POST /quiz` — Update quiz score.

#### Pyos (Subjects, Sources, Lessons) (`/api/v1/pyos`)
- `GET /subjects` — Get all subjects.
- `POST /subjects` — Create a new subject.
- `GET /subjects/:id` — Retrieve a specific subject.
- `DELETE /subjects/:id` — Delete a subject.
- `POST /subjects/syllabus` — Upload a syllabus.
- `GET /subjects/:subjectId/syllabus` — Retrieve a subject's syllabus.
- `GET /subjects/:subjectId/lessons` — Generate lessons.
- `GET /:subjectId/:lessonId` — Generate detailed lesson content.
- `GET /materials` — Get all data sources.
- `GET /materials/:id` — Retrieve a data source.
- `DELETE /materials/:id` — Delete a data source.
- `POST /materials` — Create a new data source.

#### Quiz (`/api/v1/quiz`)
- `GET /` — Retrieve all quizzes.
- `GET /:id` — Get a specific quiz.
- `POST /` — Create a new quiz.
- `POST /generate` — Generate a quiz.
- `DELETE /:id` — Delete a quiz.
- `POST /:id/attempt` — Submit a quiz attempt.
- `GET /:id/attempts` — Retrieve quiz attempts.

#### Analytics (`/api/v1/analytics`)
- `GET /quizzes` — Retrieve user quiz analytics.
- `GET /quizzes/:id` — Get analytics for a specific quiz.

#### Search (`/api/v1/query`)
- `POST /` — Answer a query using Milvus search.

#### Feed (`/api/v1/feed`)
- `GET /` — Display the user feed.

---

## Setup and Installation

### Quick Start
```bash
git clone <repository-url>
cd learnability-backend
npm install
```

### Environment Configuration
Create a `.env` file in the root directory and add:
- `JWT_SECRET`: Your secret key for JWT.
- `GOOGLE_CLOUD_PROJECT`: Your Google Cloud project ID.
- `DATABASE_URL`: Your database connection string.

### Database Setup
Ensure a compatible database (e.g., PostgreSQL) is running, then run:
```bash
npx prisma migrate dev --name init
```

### Milvus Setup
Ensure Milvus is running and accessible at `localhost:19530`.

### Running the Application
```bash
npm run dev
```

---

## License
This project is licensed under the GNU General Public License v3.