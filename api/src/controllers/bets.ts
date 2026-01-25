import { Router, Request, Response } from 'express';
import { Bet } from '../models/bets';
import { tokenRequired } from '../middleware/auth';
const router = Router();

/**
 * @route GET /bet
 * @desc Base route
 * @access Public
 */


router.get('/', getBase);
router.post('/create_topic', tokenRequired, createTopic);
router.post('/place_bet', tokenRequired, placeBet);
router.post('/create_category', tokenRequired, createCategory);
router.get('/get_user_topics', tokenRequired, getUserTopics);
router.get('/topics_feed', getTopicsFeed);
router.get('/pending_topics_old', tokenRequired, getPendingTopics);
router.get('/user_bets', tokenRequired, getUserBets);
router.get('/leaderboard', getLeaderboard);
router.post('/execute_bets', executeBets);
router.get('/categories', getCategories);
router.get('/get_requests', tokenRequired, getRequests);
router.post('/approve_topic', approveTopic);
router.post('/make_payouts', tokenRequired, makePayouts);
router.get('/get_players_for_bet', getPlayersForBet);
router.get('/get_top_questions_next_days', getTopQuestionsNextDays);
router.get('/sports', getSports);
router.get('/sports_predictions', getSportsPredictions);

// Provably Fair Game Endpoints
router.post('/games/initialize', tokenRequired, initializeGame);
router.post('/games/play', tokenRequired, playGame);
router.post('/games/record-result', tokenRequired, recordGameResult);
router.get('/games/history', tokenRequired, getGameHistory);

function getBase(req: Request, res: Response) {
  res.status(403).json({ message: 'Not allowed here' });
}

/**
 * @route POST /bet/create_topic
 * @desc Create a new betting topic
 * @access Private
 */


const betModel = new Bet();

// GET /bet/pending_topics
router.get('/pending_topics', tokenRequired, async (req, res) => {
  try {
    // The tokenRequired middleware adds userId to req
    const userId = req.userId || '';
    const result = await betModel.getPendingTopics(userId);
    res.json(result);
  } catch (error) {
    console.error('Admin pending topics error:', error);
    res.status(500).json({ status: 500, message: 'Server error', error });
  }
});

// GET /bet/active_bets_for_results
router.get('/active_bets_for_results', tokenRequired, async (req, res) => {
  try {
    const filter = {
      status: req.query.status as string || 'active',
      match_status: req.query.match_status as string || 'matched'
    };
    const result = await betModel.getActiveBetsForResults(filter);
    res.json(result);
  } catch (error) {
    console.error('Admin active bets error:', error);
    res.status(500).json({ status: 500, message: 'Server error', error });
  }
});

// POST /bet/approve_topic
router.post('/approve_topic', tokenRequired, async (req, res) => {
  try {
    // Set the approved_by field to the current user's ID
    if (!req.body.approved_by && req.userId) {
      req.body.approved_by = req.userId;
    }
    const result = await betModel.approveTopic(req);
    res.json(result);
  } catch (error) {
    console.error('Admin approve topic error:', error);
    res.status(500).json({ status: 500, message: 'Server error', error });
  }
});

// POST /bet/enter_result
router.post('/enter_result', tokenRequired, async (req, res) => {
  try {
    // Set the posted_by field to the current user's ID
    if (!req.body.posted_by && req.userId) {
      req.body.posted_by = req.userId;
    }
    // Add game_status if not provided
    if (!req.body.game_status) {
      req.body.game_status = 'finished';
    }
    const result = await betModel.insertGameResult(req);
    res.json(result);
  } catch (error) {
    console.error('Admin enter result error:', error);
    res.status(500).json({ status: 500, message: 'Server error', error });
  }
});


async function getTopQuestionsNextDays(req: Request, res: Response) {
  try {
    const result = await new Bet().getTopQuestionsNextDays()
        res.status(200).json(result);
  } catch (error) {
    console.error('Get top questions next days error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching top questions next days' 
    });
  }
}

async function getPlayersForBet(req: Request, res: Response) {
  try {
    const result = await new Bet().getPlayersForBet(req.params.topicId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while creating topic' 
    });
  }
}

async function createTopic(req: Request, res: Response) {
  try {
    const result = await new Bet().createTopic(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while creating topic' 
    });
  }
}

/**
 * @route POST /bet/place_bet
 * @desc Place a bet on a topic
 * @access Private
 */
async function placeBet(req: Request, res: Response) {
  try {
    const result = await new Bet().placeBet(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while placing bet' 
    });
  }
}

/**
 * @route POST /bet/create_category
 * @desc Create a new betting category
 * @access Private
 */
async function createCategory(req: Request, res: Response) {
  try {
    const result = await new Bet().createCategory(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while creating category' 
    });
  }
}

/**
 * @route GET /bet/get_user_topics/:userId
 * @desc Get topics created by a user
 * @access Private
 */
async function getUserTopics(req: Request, res: Response) {
  try {
    const result = await new Bet().getTopicsForUser(req.body.userId);
    res.json(result);
  } catch (error) {
    console.error('Get user topics error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching user topics' 
    });
  }
}

/**
 * @route GET /bet/topics_feed
 * @desc Get feed of betting topics
 * @access Public
 */
async function getTopicsFeed(req: Request, res: Response) {
  try {
    const result = await new Bet().topicsFeed(req.query.category as string);
    res.json(result);
  } catch (error) {
    console.error('Topics feed error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching topics feed' 
    });
  }
}

/**
 * @route GET /bet/pending_topics/:userId
 * @desc Get pending topics for a user
 * @access Private
 */
async function getPendingTopics(req: Request, res: Response) {
  try {
    const result = await new Bet().getPendingTopics(req.body.userId);
    res.json(result);
  } catch (error) {
    console.error('Pending topics error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching pending topics' 
    });
  }
}

/**
 * @route GET /bet/user_bets/:userId
 * @desc Get bets placed by a user
 * @access Public
 */
async function getUserBets(req: Request, res: Response) {
  try {
    const result = await new Bet().userBets(req.body.userId,req.query.status as string);
    res.json(result);
  } catch (error) {
    console.error('User bets error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching user bets' 
    });
  }
}

/**
 * @route GET /bet/leaderboard
 * @desc Get betting leaderboard
 * @access Public
 */
async function getLeaderboard(req: Request, res: Response) {
  try {
    const result = await new Bet().leaderboard();
    res.json(result);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching leaderboard' 
    });
  }
}

/**
 * @route POST /bet/execute_bets
 * @desc Execute bets based on game results
 * @access Public
 */
async function executeBets(req: Request, res: Response) {
  try {
    const result = await new Bet().insertGameResult(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Execute bets error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while executing bets' 
    });
  }
}

/**
 * @route GET /bet/get_categories
 * @desc Get all betting categories
 * @access Public
 */
async function getCategories(req: Request, res: Response) {
  try {
    const result = await new Bet().getAllCategories(req.query.q as string);
    res.json(result);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching categories' 
    });
  }
}

/**
 * @route GET /bet/get_requests
 * @desc Get betting requests for a user
 * @access Public
 */
async function getRequests(req: Request, res: Response) {
  try {
    const result = await new Bet().getRequests(req.body.userId);
    res.json(result);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching requests' 
    });
  }
}

/**
 * @route POST /bet/approve_topic
 * @desc Approve a betting topic
 * @access Public
 */
async function approveTopic(req: Request, res: Response) {
  try {
    const result = await new Bet().approveTopic(req);
    res.status(200).json(result);
  } catch (error) {
    console.error('Approve topic error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while approving topic' 
    });
  }
}

/**
 * @route POST /bet/make_payouts
 * @desc Make payouts for completed bets
 * @access Public
 */
async function makePayouts(req: Request, res: Response) {
  try {
    const result = await new Bet().makePaymentsPayouts(req.body.topic_id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Make payouts error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while making payouts' 
    });
  }
}

/**
 * @route GET /bet/sports
 * @desc Get sports matches
 * @access Public
 */
async function getSports(req: Request, res: Response) {
  try {
    const result = await new Bet().getSports(req.query.league as string);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching sports matches' 
    });
  }
}

/**
 * @route GET /bet/sports_predictions
 * @desc Get sports predictions with category filter
 * @access Public
 */
async function getSportsPredictions(req: Request, res: Response) {
  try {
    const result = await new Bet().getSportsPredictions(req.query.category as string);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get sports predictions error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching sports predictions' 
    });
  }
}

/**
 * @route POST /bet/games/initialize
 * @desc Initialize a provably fair game
 * @access Private
 */
async function initializeGame(req: Request, res: Response) {
  try {
    const result = await new Bet().initializeGame(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Initialize game error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while initializing game' 
    });
  }
}

/**
 * @route POST /bet/games/play
 * @desc Play a provably fair game
 * @access Private
 */
async function playGame(req: Request, res: Response) {
  try {
    const result = await new Bet().playGame(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Play game error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while playing game' 
    });
  }
}

/**
 * @route POST /bet/games/record-result
 * @desc Record game result
 * @access Private
 */
async function recordGameResult(req: Request, res: Response) {
  try {
    const result = await new Bet().recordGameResult(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Record game result error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while recording game result' 
    });
  }
}

/**
 * @route GET /bet/games/history
 * @desc Get user's game history
 * @access Private
 */
async function getGameHistory(req: Request, res: Response) {
  try {
    const result = await new Bet().getGameHistory(req.userId || '');
    res.status(200).json(result);
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error while fetching game history' 
    });
  }
}

export default router;
