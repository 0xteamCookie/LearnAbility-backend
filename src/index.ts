import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRoutes } from './routes/auth.routes';
import { dataSourceRoutes } from './routes/source.routes';
import { queryRoutes } from './routes/query.routes';
import { feedRoutes } from './routes/feed.routes';
import { pyosRoutes } from './routes/pyos.routes';
import { webhookRoutes } from './webhook/navigation';
import { quizRoutes } from './routes/quiz.routes';

dotenv.config();

const app = express();
app.use(cookieParser());

app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:3001',
    credentials: true, // allow sending cookies
  })
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);
app.use('/api/v1/user-query', queryRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/pyos', pyosRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/v1/quizzes', quizRoutes);

const PORT = process.env.PORT || 30000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
