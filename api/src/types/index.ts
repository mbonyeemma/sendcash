import { Request } from 'express';

export interface UserData {
    id?: string;
    username: string;
    email: string;
    password: string;
    public_key?: string;
    jwt_token: string;
    seed_key: string;
    avatar?: string;
    isValidator?: boolean;
    fcm_token?: string;
    auth_code?: string;
    favorites?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        username: string;
        [key: string]: any;
    };
}

export interface ApiResponse<T = any> {
    status: number;
    message?: string;
    error?: string;
    data?: T;
}

export interface DatabaseConfig {
    username: string;
    password: string;
    host: string;
    port: number;
    database: string;
}

export interface ClaimableBalanceResponse {
    hash: string;
    [key: string]: any;
}

export interface UserProfile {
    followers: number;
    following: number;
    played: number;
    won: number;
    lost: number;
} 