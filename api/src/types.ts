import { Request } from 'express';

export interface UserData {
    user_id: string;
    username: string;
    email: string;
    password: string;
    avatar: string;
    public_key: string;
    seed_key: string;
    jwt_token: string;
    fcm_token?: string;
    auth_code?: string;
    isValidator: boolean;
    favorites?: string[];
}

export interface GroupData {
    group_id: string;
    name: string;
    description: string;
    created_by: string;
    image_url?: string;
    is_private: boolean;
    access_code?: string;
    created_at: Date;
    updated_at: Date;
}

export interface GroupMemberData {
    member_id: string;
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: Date;
}

export interface GroupBetData {
    bet_id: string;
    group_id: string;
    title: string;
    description?: string;
    bet_type: string;
    options: string[];
    created_by: string;
    status: 'open' | 'closed' | 'settled';
    winning_option?: string;
    start_date: Date;
    end_date?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface ApiResponse<T = any> {
    status: number;
    message: string;
    data?: T;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        username: string;
        user_id?: string;
        [key: string]: any;
    };
    userId?: string;
}

export interface UserProfile {
    followers: number;
    following: number;
    played: number;
    won: number;
    lost: number;
}

export interface UserInfo {
    token?: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

// Extend Express Request type globally
declare global {
    namespace Express {
        interface Request {
            user?: any;
            userId?: string;
        }
    }
}
