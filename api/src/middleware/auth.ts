import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
 

export const refreshRequired = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }    

        const decoded :any= jwt.verify(token, process.env.JWT_SECRET);
        req.body.userId = decoded.user_id || "";
        req.userId = decoded.user_id || "";
        const type = decoded.type;
        if(type == "refresh"){
            req.user = decoded;
            next();
        }else{
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const tokenRequired = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }    

        const decoded :any= jwt.verify(token, process.env.JWT_SECRET);
        req.body.userId = decoded.user_id || "";
        req.userId = decoded.user_id || "";
        req.user = decoded;
        const type = decoded.type;
        if(type == "access"){
            req.user = decoded;
            next();
        }else{
            return res.status(401).json({ error: 'Invalid access token' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid access token' });
    }
};

// Extend Express Request type to include user and userId properties
declare global {
    namespace Express {
        interface Request {
            user?: any;
            userId?: string;
        }
    }
} 