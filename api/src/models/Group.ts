import { Request } from 'express';
import Modal from '../libs/modal';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../types';
import { Chat } from './chat';

interface GroupData {
    group_id: string;
    name: string;
    description: string;
    created_by: string;
    created_at: Date;
    updated_at: Date | any;
    image_url?: string;
    is_private: boolean;
    access_code?: string;
}

interface GroupMemberData {
    member_id: string;
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: Date;
}

interface GroupBetData {
    bet_id: string;
    group_id: string;
    created_by: string;
    title: string;
    description: string;
    bet_type: string;
    options: string[];
    start_date: Date;
    end_date: Date | any;
    status: 'open' | 'closed' | 'settled';
    created_at: Date;
    updated_at: Date;
    winning_option?: string;
}

interface GroupBetPlacementData {
    placement_id: string;
    bet_id: string;
    user_id: string;
    option: string;
    amount: number;
    placed_at: Date;
    result?: 'won' | 'lost' | 'pending';
    payout_amount?: number;
}

interface GroupInvitationData {
    invitation_id: string;
    group_id: string;
    invited_by: string;
    invited_user: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: Date;
    updated_at: Date;
}

export class Group extends Modal {
     async createGroup(req: Request) {
        try {
            const { name, description,userId, is_private, access_code } = req.body;
            
            // Validate input
            if (!name || name.trim() === '') {
                return {
                    status: 400,
                    message: 'Group name is required'
                };
            }
            
            const group_id = uuidv4();
            const now = new Date();
            
            // Create group
            const groupData: Partial<GroupData> = {
                group_id,
                name,
                description,
                created_by:userId,
                created_at: now,
                updated_at: now,
                is_private: is_private || false,
                access_code: is_private ? (access_code || this.generateAccessCode()) : undefined
            };
            
            await this.insertData('sia_groups', groupData);
            
            // Add creator as admin member
            const memberData: Partial<GroupMemberData> = {
                member_id: uuidv4(),
                group_id,
                user_id:userId,
                role: 'admin',
                joined_at: now
            };
            
            await this.insertData('sia_group_members', memberData);
            
            // Create chat room for the group
            const chatModel = new Chat();
            const chatRoom = await chatModel.createChatRoom(group_id);
            
            // Add creator as chat participant
            await chatModel.addParticipant(chatRoom.room_id, userId);
            
            return {
                status: 200,
                message: 'Group created successfully',
                data: { group_id, chat_room_id: chatRoom.room_id }
            };
        } catch (error) {
            console.error('Create group error:', error);
            return {
                status: 500,
                message: 'Failed to create group'
            };
        }
    }
    
     async joinGroup(req: Request) {
        try {
            const { group_id,userId, access_code } = req.body;
            const user_id = userId
            
            // Check if group exists
            const group = await this.getGroupById(group_id);
            if (!group) {
                return {
                    status: 404,
                    message: 'Group not found'
                };
            }
            
            // Check if user is already a member
            const existingMember = await this.getGroupMember(group_id, user_id);
            if (existingMember) {
                return {
                    status: 409,
                    message: 'You are already a member of this group'
                };
            }
            
            // Check if private group requires access code
            if (group.is_private && group.access_code !== access_code) {
                return {
                    status: 403,
                    message: 'Invalid access code'
                };
            }
            
            // Add user to group
            const memberData: Partial<GroupMemberData> = {
                member_id: uuidv4(),
                group_id,
                user_id,
                role: 'member',
                joined_at: new Date()
            };
            
            await this.insertData('sia_group_members', memberData);
            
            // Add user to group chat room
            const chatModel = new Chat();
            const chatRoom = await chatModel.getChatRoomByGroup(group_id);
            
            if (chatRoom) {
                // Add user as chat participant
                await chatModel.addParticipant(chatRoom.room_id, user_id);
            } else {
                // Create chat room if it doesn't exist (fallback)
                const newChatRoom = await chatModel.createChatRoom(group_id);
                await chatModel.addParticipant(newChatRoom.room_id, user_id);
            }
            
            return {
                status: 200,
                message: 'Joined group successfully'
            };
        } catch (error) {
            console.error('Join group error:', error);
            return {
                status: 500,
                message: 'Failed to join group'
            };
        }
    }
    
     async leaveGroup(req: Request) {
        try {
            const { group_id,userId } = req.body;
            const user_id = userId;
            
            // Check if user is a member
            const member = await this.getGroupMember(group_id, user_id);
            if (!member) {
                return {
                    status: 404,
                    message: 'You are not a member of this group'
                };
            }
            
            // Check if user is the last admin
            if (member.role === 'admin') {
                const adminCount = await this.countGroupAdmins(group_id);
                if (adminCount === 1) {
                    const memberCount = await this.countGroupMembers(group_id);
                    if (memberCount > 1) {
                        return {
                            status: 403,
                            message: 'You cannot leave as you are the only admin. Transfer admin rights first.'
                        };
                    } else {
                        // Last member, delete group
                        await this.deleteData('sia_groups', `group_id = '${group_id}'`);
                        return {
                            status: 200,
                            message: 'Group deleted as you were the last member'
                        };
                    }
                }
            }
            
            // Remove user from group
            await this.deleteData('sia_group_members', `group_id = '${group_id}' AND user_id = '${user_id}'`);
            
            // Remove user from group chat
            const chatModel = new Chat();
            const chatRoom = await chatModel.getChatRoomByGroup(group_id);
            
            if (chatRoom) {
                // Remove user from chat participants
                await this.deleteData('sia_chat_participants', `room_id = '${chatRoom.room_id}' AND user_id = '${user_id}'`);
            }
            
            return {
                status: 200,
                message: 'Left group successfully'
            };
        } catch (error) {
            console.error('Leave group error:', error);
            return {
                status: 500,
                message: 'Failed to leave group'
            };
        }
    }
    
     async getUserGroups(userId: string) {
        console.log("group===>",userId)
        try {
            const query = `
                SELECT g.*, gm.role 
                FROM sia_groups g
                JOIN sia_group_members gm ON g.group_id = gm.group_id
                WHERE gm.user_id = '${userId}'
                ORDER BY g.created_at DESC
            `;
            console.log(query);
            
            const groups = await this.callQuery(query);
            
            return {
                status: 200,
                message: 'Groups retrieved successfully',
                data: groups
            };
        } catch (error) {
            console.error('Get user groups error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve groups'
            };
        }
    }
    
     async getGroupDetails(groupId: string) {
        try {
            // Get group info
            const group = await this.getGroupById(groupId);
            if (!group) {
                return {
                    status: 404,
                    message: 'Group not found'
                };
            }
            
            // Get members
            const members = await this.getGroupMembers(groupId);
            
            // Get active bets
            const activeBets = await this.getActiveGroupBets(groupId);
            
            // Get chat room for the group
            const chatModel = new Chat();
            const chatRoom = await chatModel.getChatRoomByGroup(groupId);
            
            // If no chat room exists, create one (fallback)
            let roomData = chatRoom;
            if (!chatRoom) {
                roomData = await chatModel.createChatRoom(groupId);
            }
            
            return {
                status: 200,
                message: 'Group details retrieved successfully',
                data: {
                    group,
                    members,
                    activeBets,
                    chatRoom: roomData
                }
            };
        } catch (error) {
            console.error('Get group details error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve group details'
            };
        }
    }
    
     async updateGroup(req: Request) {
        try {
            const { name, description, is_private, access_code } = req.body;
            const group_id = req.params.groupId;
            const user_id = req.user.id;
            
            // Check if group exists
            const group = await this.getGroupById(group_id);
            if (!group) {
                return {
                    status: 404,
                    message: 'Group not found'
                };
            }
            
            // Check if user is admin
            const member = await this.getGroupMember(group_id, user_id);
            if (!member || member.role !== 'admin') {
                return {
                    status: 403,
                    message: 'Only admins can update group settings'
                };
            }
            
            // Update group data
            const updateData: Partial<GroupData> = {
                name: name || group.name,
                description: description || group.description,
                updated_at: new Date(),
                is_private: is_private !== undefined ? is_private : group.is_private
            };
            
            if (is_private && access_code) {
                updateData.access_code = access_code;
            }
            
            await this.updateData('sia_groups', `group_id = '${group_id}'`, updateData);
            
            return {
                status: 200,
                message: 'Group updated successfully'
            };
        } catch (error) {
            console.error('Update group error:', error);
            return {
                status: 500,
                message: 'Failed to update group'
            };
        }
    }
    
     async deleteGroup(groupId: string) {
        try {
            // Delete group and all related data
            await this.deleteData('sia_groups', `group_id = '${groupId}'`);
            
            // Cascade delete all related data
            await this.deleteData('sia_group_members', `group_id = '${groupId}'`);
            await this.deleteData('sia_group_bets', `group_id = '${groupId}'`);
            await this.deleteData('sia_group_invitations', `group_id = '${groupId}'`);
            
            return {
                status: 200,
                message: 'Group deleted successfully'
            };
        } catch (error) {
            console.error('Delete group error:', error);
            return {
                status: 500,
                message: 'Failed to delete group'
            };
        }
    }
    
     async createGroupBet(req: Request) {
        try {
            const { title, description, bet_type, options, start_date, end_date } = req.body;
            const group_id = req.params.groupId;
            const created_by = req.user.id;
            
            // Check if group exists
            const group = await this.getGroupById(group_id);
            if (!group) {
                return {
                    status: 404,
                    message: 'Group not found'
                };
            }
            
            // Check if user is member
            const member = await this.getGroupMember(group_id, created_by);
            if (!member) {
                return {
                    status: 403,
                    message: 'You must be a member to create bets'
                };
            }
            
            // Validate input
            if (!title || !bet_type || !options || !Array.isArray(options) || options.length < 2) {
                return {
                    status: 400,
                    message: 'Invalid bet parameters'
                };
            }
            
            const now = new Date();
            const bet_id = uuidv4();
            
            // Create group bet
            const betData: Partial<GroupBetData> = {
                bet_id,
                group_id,
                created_by,
                title,
                description,
                bet_type,
                options,
                start_date: start_date ? new Date(start_date) : now,
                end_date: end_date ? new Date(end_date) : null,
                status: 'open',
                created_at: now,
                updated_at: now
            };
            
            await this.insertData('sia_group_bets', betData);
            
            return {
                status: 200,
                message: 'Group bet created successfully',
                data: { bet_id }
            };
        } catch (error) {
            console.error('Create group bet error:', error);
            return {
                status: 500,
                message: 'Failed to create group bet'
            };
        }
    }
    
     async getGroupBets(groupId: string) {
        try {
            const bets = await this.callQuery(`
                SELECT * FROM sia_group_bets 
                WHERE group_id = '${groupId}'
                ORDER BY created_at DESC
            `);
            
            return {
                status: 200,
                message: 'Group bets retrieved successfully',
                data: bets
            };
        } catch (error) {
            console.error('Get group bets error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve group bets'
            };
        }
    }
    
     async getGroupBet(groupId: string, betId: string) {
        try {
            // Get bet details
            const bets:any = await this.callQuery(`
                SELECT * FROM sia_group_bets 
                WHERE group_id = '${groupId}' AND bet_id = '${betId}'
            `);
            
            if (bets.length === 0) {
                return {
                    status: 404,
                    message: 'Group bet not found'
                };
            }
            
            const bet = bets[0];
            
            // Get placements
            const placements = await this.callQuery(`
                SELECT bp.*, u.username 
                FROM sia_group_bet_placements bp
                JOIN sia_users u ON bp.user_id = u.user_id
                WHERE bp.bet_id = '${betId}'
                ORDER BY bp.placed_at DESC
            `);
            
            return {
                status: 200,
                message: 'Group bet details retrieved successfully',
                data: {
                    bet,
                    placements
                }
            };
        } catch (error) {
            console.error('Get group bet error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve group bet details'
            };
        }
    }
    
     async updateGroupBet(req: Request) {
        try {
            const { status, winning_option } = req.body;
            const group_id = req.params.groupId;
            const bet_id = req.params.betId;
            const user_id = req.user.id;
            
            // Check if bet exists
            const bet = await this.getGroupBetById(bet_id, group_id);
            if (!bet) {
                return {
                    status: 404,
                    message: 'Group bet not found'
                };
            }
            
            // Check if user is creator or admin
            const member = await this.getGroupMember(group_id, user_id);
            if (!member || (member.role !== 'admin' && bet.created_by !== user_id)) {
                return {
                    status: 403,
                    message: 'Only bet creator or group admin can update bet'
                };
            }
            
            // Update bet
            const updateData: Partial<GroupBetData> = {
                updated_at: new Date()
            };
            
            if (status) {
                updateData.status = status;
            }
            
            if (status === 'settled' && winning_option) {
                if (!bet.options.includes(winning_option)) {
                    return {
                        status: 400,
                        message: 'Invalid winning option'
                    };
                }
                
                updateData.winning_option = winning_option;
                
                // Update all placements with results
                await this.updateBetPlacements(bet_id, winning_option);
            }
            
            await this.updateData('sia_group_bets', `bet_id = '${bet_id}' AND group_id = '${group_id}'`, updateData);
            
            return {
                status: 200,
                message: 'Group bet updated successfully'
            };
        } catch (error) {
            console.error('Update group bet error:', error);
            return {
                status: 500,
                message: 'Failed to update group bet'
            };
        }
    }
    
     async placeGroupBet(req: Request) {
        try {
            const { option, amount } = req.body;
            const group_id = req.params.groupId;
            const bet_id = req.params.betId;
            const user_id = req.user.id;
            
            // Check if bet exists and is open
            const bet = await this.getGroupBetById(bet_id, group_id);
            if (!bet) {
                return {
                    status: 404,
                    message: 'Group bet not found'
                };
            }
            
            if (bet.status !== 'open') {
                return {
                    status: 403,
                    message: 'This bet is closed for new placements'
                };
            }
            
            // Check if user is member
            const member = await this.getGroupMember(group_id, user_id);
            if (!member) {
                return {
                    status: 403,
                    message: 'You must be a group member to place bets'
                };
            }
            
            // Check if option is valid
            if (!bet.options.includes(option)) {
                return {
                    status: 400,
                    message: 'Invalid bet option'
                };
            }
            
            // Check if amount is valid
            if (!amount || amount <= 0) {
                return {
                    status: 400,
                    message: 'Invalid bet amount'
                };
            }
            
            // Create placement
            const placementData: Partial<GroupBetPlacementData> = {
                placement_id: uuidv4(),
                bet_id,
                user_id,
                option,
                amount,
                placed_at: new Date(),
                result: 'pending'
            };
            
            await this.insertData('sia_group_bet_placements', placementData);
            
            return {
                status: 200,
                message: 'Bet placed successfully'
            };
        } catch (error) {
            console.error('Place group bet error:', error);
            return {
                status: 500,
                message: 'Failed to place bet'
            };
        }
    }
    
     async getGroupLeaderboard(groupId: string) {
        try {
            const leaderboard = await this.callQuery(`
                SELECT 
                    u.user_id, 
                    u.username, 
                    u.avatar,
                    COUNT(CASE WHEN gbp.result = 'won' THEN 1 END) AS wins,
                    COUNT(CASE WHEN gbp.result = 'lost' THEN 1 END) AS losses,
                    SUM(CASE WHEN gbp.result = 'won' THEN gbp.payout_amount - gbp.amount ELSE -gbp.amount END) AS profit
                FROM sia_users u
                JOIN sia_group_members gm ON u.user_id = gm.user_id
                LEFT JOIN sia_group_bet_placements gbp ON u.user_id = gbp.user_id
                LEFT JOIN sia_group_bets gb ON gbp.bet_id = gb.bet_id
                WHERE gm.group_id = '${groupId}' AND gb.group_id = '${groupId}'
                GROUP BY u.user_id, u.username, u.avatar
                ORDER BY profit DESC, wins DESC
            `);
            
            return {
                status: 200,
                message: 'Group leaderboard retrieved successfully',
                data: leaderboard
            };
        } catch (error) {
            console.error('Get group leaderboard error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve group leaderboard'
            };
        }
    }
    
     async inviteUserToGroup(req: Request) {
        try {
            const { username } = req.body;
            const group_id = req.params.groupId;
            const invited_by = req.user.id;
            
            // Check if group exists
            const group = await this.getGroupById(group_id);
            if (!group) {
                return {
                    status: 404,
                    message: 'Group not found'
                };
            }
            
            // Check if user exists
            const users:any = await this.callQuery(
                `SELECT user_id FROM sia_users WHERE username = '${username}'`
            );
            
            if (users.length === 0) {
                return {
                    status: 404,
                    message: 'User not found'
                };
            }
            
            const invited_user = users[0].user_id;
            
            // Check if user is already a member
            const existingMember = await this.getGroupMember(group_id, invited_user);
            if (existingMember) {
                return {
                    status: 409,
                    message: 'User is already a member of this group'
                };
            }
            
            // Check if invitation already exists
            const existingInvite:any = await this.callQuery(`
                SELECT * FROM sia_group_invitations
                WHERE group_id = '${group_id}' AND invited_user = '${invited_user}' AND status = 'pending'
            `);
            
            if (existingInvite.length > 0) {
                return {
                    status: 409,
                    message: 'User has already been invited to this group'
                };
            }
            
            // Create invitation
            const invitationData: Partial<GroupInvitationData> = {
                invitation_id: uuidv4(),
                group_id,
                invited_by,
                invited_user,
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
            };
            
            await this.insertData('sia_group_invitations', invitationData);
            
            return {
                status: 200,
                message: 'Invitation sent successfully'
            };
        } catch (error) {
            console.error('Invite user error:', error);
            return {
                status: 500,
                message: 'Failed to send invitation'
            };
        }
    }
    
     async getUserInvitations(userId: string) {
        try {
            const invitations = await this.callQuery(`
                SELECT gi.*, g.name as group_name, u.username as invited_by_username
                FROM sia_group_invitations gi
                JOIN sia_groups g ON gi.group_id = g.group_id
                JOIN sia_users u ON gi.invited_by = u.user_id
                WHERE gi.invited_user = '${userId}' AND gi.status = 'pending'
                ORDER BY gi.created_at DESC
            `);
            
            return {
                status: 200,
                message: 'Invitations retrieved successfully',
                data: invitations
            };
        } catch (error) {
            console.error('Get user invitations error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve invitations'
            };
        }
    }
    
     async respondToInvitation(req: Request) {
        try {
            const { invitation_id, response } = req.body;
            const user_id = req.user.id;
            
            // Get invitation
            const invitation: any = await this.callQuery(
                `SELECT * FROM sia_group_invitations WHERE invitation_id = '${invitation_id}' AND invited_user = '${user_id}'`
            );
            
            if (invitation.length === 0) {
                return {
                    status: 404,
                    message: 'Invitation not found'
                };
            }
            
            // Update invitation status
            await this.updateData('sia_group_invitations', 
                `status = '${response}' AND invitation_id = '${invitation_id}'`,
                { updated_at: new Date() }
            );
            
            if (response === 'accepted') {
                // Add user to group
                const memberData: Partial<GroupMemberData> = {
                    member_id: uuidv4(),
                    group_id: invitation[0].group_id,
                    user_id,
                    role: 'member',
                    joined_at: new Date()
                };
                
                await this.insertData('sia_group_members', memberData);
            }
            
            return {
                status: 200,
                message: `Invitation ${response} successfully`
            };
        } catch (error) {
            console.error('Respond to invitation error:', error);
            return {
                status: 500,
                message: 'Failed to respond to invitation'
            };
        }
    }
    
    // Helper methods
    private  async getGroupById(groupId: string): Promise<GroupData | any> {
        const groups:any = await this.callQuery(
            `SELECT * FROM sia_groups WHERE group_id = '${groupId}'`
        );
        return groups.length > 0 ? groups[0] : null;
    }
    
    private  async getGroupBetById(betId: string, groupId: string): Promise<GroupBetData | any> {
        const bets:any = await this.callQuery(
            `SELECT * FROM sia_group_bets WHERE bet_id = '${betId}' AND group_id = '${groupId}'`
        );
        return bets.length > 0 ? bets[0] : null;
    }
    
    private  async getGroupMember(groupId: string, userId: string): Promise<GroupMemberData | any> {
        const members:any = await this.callQuery(
            `SELECT * FROM sia_group_members WHERE group_id = '${groupId}' AND user_id = '${userId}'`
        );
        return members.length > 0 ? members[0] : null;
    }
    
    private async _getGroupMembersInternal(groupId: string): Promise<any[]> {
        const query = `SELECT * FROM sia_group_members WHERE group_id = '${groupId}'`;
        return await this.callQuery(query) as any[];
    }
    
    private  async countGroupAdmins(groupId: string): Promise<number> {
        const result:any = await this.callQuery(
            `SELECT COUNT(*) as count FROM sia_group_members 
             WHERE group_id = '${groupId}' AND role = 'admin'`
        );
        return result[0].count;
    }
    
    private  async countGroupMembers(groupId: string): Promise<number> {
        const result:any = await this.callQuery(
            `SELECT COUNT(*) as count FROM sia_group_members 
             WHERE group_id = '${groupId}'`
        );
        return result[0].count;
    }
    
    private  async getActiveGroupBets(groupId: string): Promise<any[]> {
        const bets:any = await this.callQuery(
            `SELECT * FROM sia_group_bets WHERE group_id = '${groupId}' AND status = 'open'`
        );
        return bets;
    }
    
    private  async updateBetPlacements(betId: string, winningOption: string): Promise<void> {
        // First get the bet to calculate payout amounts
        const bets:any = await this.callQuery(
            `SELECT * FROM sia_group_bets WHERE bet_id = '${betId}'`
        );
        
        if (bets.length === 0) return;
        
        const bet = bets[0];
        
        // Update all placements
        const placements:any = await this.callQuery(
            `SELECT * FROM sia_group_bet_placements WHERE bet_id = '${betId}'`
        );
        
        for (const placement of placements) {
            const result = placement.option === winningOption ? 'won' : 'lost';
            let payout_amount = 0;
            
            if (result === 'won') {
                // Simple payout calculation - can be changed to more complex odds/pool calculation
                payout_amount = placement.amount * 2;
            }
            
            await this.updateData('sia_group_bet_placements',
                `placement_id = '${placement.placement_id}'`,
                { result, payout_amount }
            );
        }
    }
    
    private  generateAccessCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Discover groups with pagination, search and sorting
    async discoverGroups(
        page: number = 1,
        limit: number = 10,
        search?: string,
        sort?: string,
        isPrivate: boolean = false
    ) {
        try {
            const offset = (page - 1) * limit;
            
            // Build the base query
            let query = `SELECT g.*, 
                (SELECT COUNT(*) FROM sia_group_members WHERE group_id = g.group_id) as members_count 
                FROM sia_groups g
                WHERE g.is_private = ${isPrivate ? 1 : 0}`;
            
            // Add search condition if provided
            if (search) {
                query += ` AND (g.name LIKE '%${search}%' OR g.description LIKE '%${search}%')`;
            }
            
            // Add sorting
            if (sort) {
                switch (sort) {
                    case 'newest':
                        query += ` ORDER BY g.created_at DESC`;
                        break;
                    case 'oldest':
                        query += ` ORDER BY g.created_at ASC`;
                        break;
                    case 'members':
                        query += ` ORDER BY members_count DESC`;
                        break;
                    case 'activity':
                        query += ` ORDER BY g.updated_at DESC`;
                        break;
                    default:
                        query += ` ORDER BY g.created_at DESC`;
                }
            } else {
                query += ` ORDER BY g.created_at DESC`;
            }
            
            // Get total count for pagination
            const countQuery = query.replace('SELECT g.*, \n                (SELECT COUNT(*) FROM sia_group_members WHERE group_id = g.group_id) as members_count \n                ', 'SELECT COUNT(*) as total ');
            const countResult = await this.callQuery(countQuery);
            const total = countResult[0]?.total || 0;
            
            // Add pagination
            query += ` LIMIT ${limit} OFFSET ${offset}`;
            
            // Execute the query
            const groups = await this.callQuery(query);
            
            return {
                status: 200,
                message: 'Groups fetched successfully',
                data: {
                    groups: groups || [],
                    total,
                    page,
                    limit
                }
            };
        } catch (error) {
            console.error('Discover groups error:', error);
            return {
                status: 500,
                message: 'Failed to discover groups'
            };
        }
    }
    
    // Add a new public method to get group members with details
    async getGroupMembers(groupId: string) {
        try {
            const query = `
                SELECT 
                    gm.*, 
                    u.username, 
                    u.avatar,
                    u.email
               FROM sia_group_members gm
                JOIN sia_users u ON gm.user_id = u.user_id
                WHERE gm.group_id = '${groupId}'
            `;
            console.log(query);
            
            const members = await this.callQuery(query)
            
            return {
                status: 200,
                message: 'Group members retrieved successfully',
                data: members
            };
        } catch (error) {
            console.error('Get group members error:', error);
            return {
                status: 500,
                message: 'Failed to retrieve group members'
            };
        }
    }
}
