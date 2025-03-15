import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { dataSourceRoutes } from './routes/source.routes';
import { syllabusRoutes } from './routes/syllabus.routes';
import { feedRoutes } from './routes/feed.routes';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/data-sources', dataSourceRoutes);
app.use('/api/v1/syllabus', syllabusRoutes);
app.use('/api/v1/feed', feedRoutes);

const PORT = process.env.PORT || 30000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
