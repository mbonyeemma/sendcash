import { Response } from 'express';

export const handleError = (res: Response, error: any) => {
  console.error('Error:', error);
  
  return res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}; 