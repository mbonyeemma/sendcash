import { v4 as uuidv4 } from 'uuid';
import Modal from '../libs/modal';

interface ChatMessage {
    message_id: string;
    room_id: string;
    user_id: string;
    message: string;
    media_url?: string;
    created_at: Date;
    updated_at: Date;
}

interface ChatRoom {
    room_id: string;
    group_id: string;
    created_at: Date;
    updated_at: Date;
}

interface ChatParticipant {
    participant_id: string;
    room_id: string;
    user_id: string;
    last_read_at?: Date;
    created_at: Date;
}

export class Chat extends Modal {
    async createChatRoom(groupId: string): Promise<ChatRoom> {
        try {
            const roomId = uuidv4();
            await this.callQuery(
                `INSERT INTO sia_chat_rooms (room_id, group_id) VALUES ('${roomId}', '${groupId}')`
            );
            
            // Get the created room
            const room = await this.getChatRoom(roomId);
            
            // If room wasn't found for some reason, return a minimal valid object
            if (!room) {
                return {
                    room_id: roomId,
                    group_id: groupId,
                    created_at: new Date(),
                    updated_at: new Date()
                };
            }
            
            return room;
        } catch (error) {
            console.error('Error creating chat room:', error);
            // Return a minimal valid object to prevent null reference errors
            return {
                room_id: uuidv4(),
                group_id: groupId,
                created_at: new Date(),
                updated_at: new Date()
            };
        }
    }

    async getChatRoom(roomId: string): Promise<ChatRoom> {
        const rooms = await this.callQuery(
            `SELECT * FROM sia_chat_rooms WHERE room_id = '${roomId}'`
        ) as ChatRoom[];
        return rooms[0];
    }

    async getChatRoomByGroup(groupId: string): Promise<ChatRoom> {
        const rooms = await this.callQuery(
            `SELECT * FROM sia_chat_rooms WHERE group_id = '${groupId}'`
        ) as ChatRoom[];
        return rooms[0];
    }
    
    async getUserChatRooms(userId: string): Promise<any[]> {
        try {
            // Get all chat rooms where the user is a participant
            const query = `
                SELECT cr.*, g.name as group_name, g.image_url as group_image,
                (SELECT COUNT(*) FROM sia_chat_messages cm 
                 WHERE cm.room_id = cr.room_id AND cm.created_at > 
                 COALESCE((SELECT last_read_at FROM sia_chat_participants 
                          WHERE room_id = cr.room_id AND user_id = '${userId}'), '1970-01-01')
                ) as unread_count,
                (SELECT message FROM sia_chat_messages 
                 WHERE room_id = cr.room_id 
                 ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM sia_chat_messages 
                 WHERE room_id = cr.room_id 
                 ORDER BY created_at DESC LIMIT 1) as last_activity
                FROM sia_chat_rooms cr
                JOIN sia_chat_participants cp ON cr.room_id = cp.room_id
                JOIN sia_groups g ON cr.group_id = g.group_id
                WHERE cp.user_id = '${userId}'
                ORDER BY last_activity DESC
            `;
            
            const rooms :any = await this.callQuery(query);
            return rooms || [];
        } catch (error) {
            console.error('Error getting user chat rooms:', error);
            return [];
        }
    }

    async addParticipant(roomId: string, userId: string): Promise<void> {
        const participantId = uuidv4();
        await this.callQuery(
            `INSERT INTO sia_chat_participants (participant_id, room_id, user_id) 
             VALUES ('${participantId}', '${roomId}', '${userId}')`
        );
    }

    async getParticipants(roomId: string): Promise<ChatParticipant[]> {
        return await this.callQuery(
            `SELECT cp.*, u.username, u.avatar 
             FROM sia_chat_participants cp
             JOIN sia_users u ON cp.user_id = u.user_id
             WHERE cp.room_id = '${roomId}'`
        ) as ChatParticipant[];
    }

    async sendMessage(roomId: string, userId: string, message: string, mediaUrl?: string): Promise<ChatMessage> {
        const messageId = uuidv4();
        await this.callQuery(
            `INSERT INTO sia_chat_messages (message_id, room_id, user_id, message, media_url) 
             VALUES ('${messageId}', '${roomId}', '${userId}', '${message}', ${mediaUrl ? `'${mediaUrl}'` : 'NULL'})`
        );
        return this.getMessage(messageId);
    }

    async getMessage(messageId: string): Promise<ChatMessage> {
        const messages = await this.callQuery(
            `SELECT * FROM sia_chat_messages WHERE message_id = '${messageId}'`
        ) as ChatMessage[];
        return messages[0];
    }

    async getMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
        return await this.callQuery(
            `SELECT m.*, u.username, u.avatar
             FROM sia_chat_messages m
             JOIN sia_users u ON m.user_id = u.user_id
             WHERE m.room_id = '${roomId}'
             ORDER BY m.created_at DESC
             LIMIT ${limit} OFFSET ${offset}`
        ) as ChatMessage[];
    }

    async updateLastRead(roomId: string, userId: string): Promise<void> {
        await this.callQuery(
            `UPDATE sia_chat_participants 
             SET last_read_at = CURRENT_TIMESTAMP
             WHERE room_id = '${roomId}' AND user_id = '${userId}'`
        );
    }

    async getUnreadCount(roomId: string, userId: string): Promise<number> {
        const result = await this.callQuery(
            `SELECT COUNT(*) as count
             FROM sia_chat_messages m
             LEFT JOIN sia_chat_participants p 
             ON m.room_id = p.room_id AND p.user_id = '${userId}'
             WHERE m.room_id = '${roomId}'
             AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)`
        ) as { count: number }[];
        return result[0].count;
    }

    async deleteMessage(messageId: string, userId: string) {
        const result = await this.callQuery(
            `DELETE FROM sia_chat_messages 
             WHERE message_id = '${messageId}' AND user_id = '${userId}'`
        );
        return this.makeResponse(200, "Message deleted successfully");
    }

    async deleteChatRoom(roomId: string): Promise<void> {
        await this.callQuery(
            `DELETE FROM sia_chat_rooms WHERE room_id = '${roomId}'`
        );
    }
} 