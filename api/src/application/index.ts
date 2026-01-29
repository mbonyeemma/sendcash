import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ApiResponse } from '../types';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const errorResponse: ApiResponse = {
    status: 500,
    message: 'Something broke!'
  };
  res.status(500).json(errorResponse);
});

export default app;
