import { Router, Request, Response } from 'express';
import { Chat } from '../models/chat';
import { tokenRequired } from '../middleware/auth';

const router = Router();
const chatModel = new Chat();

// Get all chat rooms for a user
router.get('/rooms', tokenRequired, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const rooms = await chatModel.getUserChatRooms(userId);
        
        res.json({ status: 200, message: "Chat rooms fetched successfully", data: rooms });
    } catch (error) {
        console.error('Get chat rooms error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Create or get chat room for a group
router.post('/room/:groupId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Check if chat room exists
        let room = await chatModel.getChatRoomByGroup(groupId);

        // If no room exists, create one
        if (!room) {
            room = await chatModel.createChatRoom(groupId);
            // Add the creator as a participant
            await chatModel.addParticipant(room.room_id, userId);
        }

        res.json({ status: 200, message: "Chat room fetched successfully", data: room });
    } catch (error) {
        console.error('Chat room error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Get chat room messages
router.get('/messages/:roomId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.userId;

        const messages = await chatModel.getMessages(
            roomId,
            Number(limit),
            Number(offset)
        );

        // Update last read timestamp
        await chatModel.updateLastRead(roomId, userId);

        res.json({ status: 200, message: "Messages fetched successfully", data: messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Send message
router.post('/message/:roomId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const { message, mediaUrl } = req.body;
        const userId = req.userId;

        if (!message) {
            return res.status(400).json({ status: 400, message: 'Message is required' });
        }

        const newMessage = await chatModel.sendMessage(roomId, userId, message, mediaUrl);
        res.json({ status: 200, message: "Message sent successfully", data: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Get chat room participants
router.get('/participants/:roomId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const participants = await chatModel.getParticipants(roomId);
        res.json({ status: 200, message: "Participants fetched successfully", data: participants });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Get unread message count
router.get('/unread/:roomId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const userId = req.userId;
        const count = await chatModel.getUnreadCount(roomId, userId);
        res.json({ status: 200, message: "Unread count fetched successfully", data: { count } });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Mark messages as read
router.put('/unread/:roomId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const userId = req.userId;
        
        // Update the last read timestamp for this user in this room
        await chatModel.updateLastRead(roomId, userId);
        
        res.json({ status: 200, message: "Messages marked as read successfully" });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

// Delete message
router.delete('/message/:messageId', tokenRequired, async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const userId = req.userId;

        const deleted = await chatModel.deleteMessage(messageId, userId);
        if (!deleted) {
            return res.status(404).json({ status: 404, message: 'Message not found or unauthorized' });
        }

        res.json({ status: 200, message: "Message deleted successfully" });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ status: 500, message: 'Server error' });
    }
});

export default router; 