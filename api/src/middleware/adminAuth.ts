import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// Extend Request interface to include admin info
declare global {
  namespace Express {
    interface Request {
      admin?: {
        admin_id: string;
        email: string;
        username: string;
        type: string;
      };
    }
  }
}

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        message: 'Access denied. No token provided.',
        data: null
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.secretKey) as any;
    
    // Check if it's an admin token
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        status: 403,
        message: 'Access denied. Admin privileges required.',
        data: null
      });
    }

    // Add admin info to request
    req.admin = {
      admin_id: decoded.admin_id,
      email: decoded.email,
      username: decoded.username,
      type: decoded.type
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({
      status: 401,
      message: 'Invalid token.',
      data: null
    });
  }
};

// Helper function to get admin ID from request
export const getAdminId = (req: Request): string => {
  if (!req.admin) {
    throw new Error('Admin not authenticated');
  }
  return req.admin.admin_id;
}; 