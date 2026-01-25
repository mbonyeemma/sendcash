import { Router, Request, Response } from 'express';
import { Group } from '../models/Group';
import { Bet } from '../models/bets';
import { tokenRequired } from '../middleware/auth';

const router = Router();

router.get('/', getBase);
router.post('/create', tokenRequired, createGroup);
router.post('/join', tokenRequired, joinGroup);
router.post('/leave', tokenRequired, leaveGroup);
router.get('/user', tokenRequired, getUserGroups);
router.get('/discover', tokenRequired, discoverGroups);
router.get('/:groupId', tokenRequired, getGroupDetails);
router.put('/:groupId', tokenRequired, updateGroup);
router.delete('/:groupId', tokenRequired, deleteGroup);
router.post('/:groupId/bets/create', tokenRequired, createGroupBet);
router.get('/:groupId/bets', tokenRequired, getGroupBets);
router.get('/:groupId/bets/:betId', tokenRequired, getGroupBet);
router.post('/:groupId/bets/:betId/place', tokenRequired, placeGroupBet);
router.get('/:groupId/leaderboard', tokenRequired, getGroupLeaderboard);
router.post('/:groupId/invite', tokenRequired, inviteUserToGroup);
router.get('/invitations/:userId', tokenRequired, getUserInvitations);
router.post('/invitations/:invitationId/respond', tokenRequired, respondToInvitation);
router.get('/:groupId/members', tokenRequired, getGroupMembers);



/**
 * @route GET /group
 * @desc Base route
 * @access Public
 */
async function getBase(req: Request, res: Response) {
  res.status(403).json({ message: 'Not allowed here' });
};

/**
 * @route POST /group/create
 * @desc Create a new group
 * @access Private
 */
async function createGroup(req: Request, res: Response) {
  try {
    const result = await new Group().createGroup(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while creating group' 
    });
  }
};

/**
 * @route POST /group/join
 * @desc Join an existing group
 * @access Private
 */
async function joinGroup(req: Request, res: Response) {
  try {
    const result = await new Group().joinGroup(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while joining group' 
    });
  }
};

/**
 * @route POST /group/leave
 * @desc Leave a group
 * @access Private
 */
async function leaveGroup(req: Request, res: Response) {
  try {
    const result = await new Group().leaveGroup(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while leaving group' 
    });
  }
};

/**
 * @route GET /group/user/:userId
 * @desc Get groups for a user
 * @access Private
 */
async function getUserGroups(req: Request, res: Response) {
  try {
    const result = await new Group().getUserGroups(req.body.userId);
    res.json(result);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching user groups' 
    });
  }
};

/**
 * @route GET /group/:groupId
 * @desc Get details for a specific group
 * @access Private
 */
async function getGroupDetails(req: Request, res: Response) {
  try {
    const result = await new Group().getGroupDetails(req.params.groupId);
    res.json(result);
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group details' 
    });
  }
};

/**
 * @route PUT /group/:groupId
 * @desc Update a group
 * @access Private
 */
async function updateGroup(req: Request, res: Response) {
  try {
    const result = await new Group().updateGroup(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while updating group' 
    });
  }
};

/**
 * @route DELETE /group/:groupId
 * @desc Delete a group
 * @access Private
 */
async function deleteGroup(req: Request, res: Response) {
  try {
    const result = await new Group().deleteGroup(req.params.groupId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while deleting group' 
    });
  }
};

/**
 * @route POST /group/:groupId/bets/create
 * @desc Create a bet within a group
 * @access Private
 */
async function createGroupBet(req: Request, res: Response) {
  try {
    req.body.group_id = req.params.groupId; // Add group_id to request body
    const result = await new Bet().createTopic(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Create group bet error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while creating group bet' 
    });
  }
};

/**
 * @route GET /group/:groupId/bets
 * @desc Get bets for a group
 * @access Private
 */
async function getGroupBets(req: Request, res: Response) {
  try {
    const result = await new Bet().getTopicsForGroup(req.params.groupId);
    res.json(result);
  } catch (error) {
    console.error('Get group bets error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group bets' 
    });
  }
};

/**
 * @route GET /group/:groupId/bets/:betId
 * @desc Get a specific bet in a group
 * @access Private
 */
async function getGroupBet(req: Request, res: Response) {
  try {
    const result = await new Bet().getGroupBet(req.params.groupId, req.params.betId);
    res.json(result);
  } catch (error) {
    console.error('Get group bet error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group bet' 
    });
  }
};

/**
 * @route POST /group/:groupId/bets/:betId/place
 * @desc Place a bet within a group
 * @access Private
 */
async function placeGroupBet(req: Request, res: Response) {
  try {
    req.body.group_id = req.params.groupId;
    req.body.topic_id = req.params.betId;
    const result = await new Bet().placeBet(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Place group bet error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while placing group bet' 
    });
  }
};

/**
 * @route GET /group/:groupId/leaderboard
 * @desc Get leaderboard for a group
 * @access Private
 */
async function getGroupLeaderboard(req: Request, res: Response) {
  try {
    const result = await new Group().getGroupLeaderboard(req.params.groupId);
    res.json(result);
  } catch (error) {
    console.error('Get group leaderboard error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group leaderboard' 
    });
  }
};

/**
 * @route POST /group/:groupId/invite
 * @desc Invite a user to a group
 * @access Private
 */
async function inviteUserToGroup(req: Request, res: Response) {
  try {
    const result = await new Group().inviteUserToGroup(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Invite user to group error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while inviting user to group' 
    });
  }
};

/**
 * @route GET /group/invitations/:userId
 * @desc Get invitations for a user
 * @access Private
 */
async function getUserInvitations(req: Request, res: Response) {
  try {
    const result = await new Group().getUserInvitations(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching user invitations' 
    });
  }
};

/**
 * @route POST /group/invitations/:invitationId/respond
 * @desc Respond to a group invitation
 * @access Private
 */
async function respondToInvitation(req: Request, res: Response) {
  try {
    const result = await new Group().respondToInvitation(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while responding to invitation' 
    });
  }
};

/**
 * @route GET /group/:groupId/members
 * @desc Get members of a specific group
 * @access Private
 */
async function getGroupMembers(req: Request, res: Response) {
  try {
    const result = await new Group().getGroupMembers(req.params.groupId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group members' 
    });
  }
};

/**
 * @route GET /group/discover
 * @desc Discover public groups with pagination
 * @access Private
 */
async function discoverGroups(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const sort = req.query.sort as string;
    const isPrivate = req.query.is_private === 'true';
    
    const result = await new Group().discoverGroups(page, limit, search, sort, isPrivate);
    res.status(200).json(result);
  } catch (error) {
    console.error('Discover groups error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while discovering groups' 
    });
  }
};

/**
 * @route GET /group/categories
 * @desc Get group categories
 * @access Private
 */
async function getGroupCategories(req: Request, res: Response) {
  try {
    // For now, return a static list of categories
    const categories = [
      'Sports',
      'Politics',
      'Entertainment',
      'Finance',
      'Technology',
      'Gaming',
      'Science',
      'Health',
      'Education',
      'Other'
    ];
    
    res.status(200).json({
      status: 200,
      message: 'Categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Get group categories error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching group categories' 
    });
  }
};

// Register routes

export default router;
