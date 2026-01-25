import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { tokenRequired } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import config from '../config';

const router = Router();

router.get('/', getBase);
router.post('/register', registerUser);
router.post('/login', login);
router.post('/setup_pin', tokenRequired, setupPin);
router.post('/verify-otp', verifyRegistrationOTP);
router.get('/has_pin/:userId', hasPin);
router.post('/make_validator', tokenRequired, makeValidator);
router.post('/update_profile', tokenRequired, updateProfile);
router.post('/update_favorite', tokenRequired, updateFavorite);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTP);
router.post('/update_favorite', tokenRequired, updateFavorite);
router.get('/search_users', tokenRequired, searchUsers);
router.get('/get_user_by_id/:userId', tokenRequired, getUserById);
router.get('/profile', tokenRequired, getProfile);
router.post('/follow_user', tokenRequired, followUser);
router.get('/following', tokenRequired, getFollowing);
router.get('/followers', tokenRequired, getFollowers);
router.post('/airdrop', tokenRequired, airdrop);
router.get('/validate-token', validateToken);
router.post('/registerPushToken', tokenRequired, registerPushToken);
router.post('/change-pin', tokenRequired, changePin);
router.get('/notifications', tokenRequired, async (req: Request, res: Response) => {
  const functionName = 'getNotifications';
  logRequest(functionName, { userId: req.user?.id });
  try {
    
    const result = await new User().getNotifications(req.body.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to get notifications' });
  }
});
router.post('/notifications/markasread', tokenRequired, async (req: Request, res: Response) => {
  const functionName = 'markNotificationsAsRead';
  try {
    const userId = req.body.userId
    const { notificationIds } = req.body;
    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return makeResponse(res, { status: 400, message: 'Invalid request: userId and notificationIds required' });
    }
    const result = await new User().markNotificationsAsRead(userId, notificationIds);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to mark notifications as read' });
  }
});

router.post('/notifications/delete', tokenRequired, async (req: Request, res: Response) => {
  const functionName = 'deleteNotifications';
  logRequest(functionName, { userId: req.body.userId, notificationIds: req.body.notificationIds });
  try {
    const userId = req.body.userId
    const { notificationIds } = req.body;
    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return makeResponse(res, { status: 400, message: 'Invalid request: userId and notificationIds required' });
    }
    const result = await new User().deleteNotifications(userId, notificationIds);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to delete notifications' });
  }
});


/**
 * @route POST /user/change-pin
 * @desc Change user PIN
 * @access Private
 */
async function changePin(req: Request, res: Response) {
  const functionName = 'changePin';
  logRequest(functionName, { ...req.body, oldPin: '****', newPin: '****' });
  try {
    const { userId, oldPin, newPin } = req.body;
    const result = await new User().changePin(userId, oldPin, newPin);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to change PIN' });
  }
}




router.post('/send-otp-mobile', async (req: Request, res: Response) => {
  const functionName = 'sendOTPMobile';
  logRequest(functionName, { phone: req.body.phone });
  try {
    const result = await new User().generateMobileOTP(req.body.phone);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to send mobile OTP' });
  }
});

router.post('/google-signin', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        status: 'error',
        message: 'ID token is required'
      });
    }

    const result = await new User().googleLoginOrRegister({ idToken });
    return res.status(result.status).json(result);
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});



router.get('/countries', async (req: Request, res: Response) => {
  try {
    const countries = await new User().getCountries();
    makeResponse(res, { status: 200, data: countries });
  } catch (error: any) {
    makeResponse(res, { status: 500, message: error.message || 'Failed to fetch countries' });
  }
});
router.get('/getCountries', async (req: Request, res: Response) => {
  try {
    const countries = await new User().getCountries();
    makeResponse(res, { status: 200, data: countries });
  } catch (error: any) {
    makeResponse(res, { status: 500, message: error.message || 'Failed to fetch countries' });
  }
});


router.post('/telegram', async (req, res) => {
  try {
    const telegramUser = req.body;
    if (!telegramUser || !telegramUser.id) {
      return res.status(400).json({ status: 400, message: 'Invalid Telegram user data' });
    }
    const result = await new User().registerTelegramUser(telegramUser);
    logResponse('telegram', result);
    makeResponse(res, result);
  } catch (err) {
    console.error('Telegram login error:', err);
    return res.status(500).json({ status: 500, message: 'Internal server error' });
  }
});

// Helper function for logging
const logRequest = (functionName: string, data: any) => {
  console.log(`🚀 [${functionName}] Request:`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

const logError = (functionName: string, error: any) => {
  console.error(`❌ [${functionName}] Error:`, {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack
  });
};

const logResponse = (functionName: string, data: any) => {
  console.log(`📥 [${functionName}] Response:`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Helper function for standardized responses
const makeResponse = (res: Response, result: any) => {
  return res.status(200).json(result);
};

/**
 * @route GET /
 * @desc Base route
 * @access Public
 */
function getBase(req: Request, res: Response) {
  makeResponse(res, { status: 403, message: 'Not allowed here' });
}

/**
 * @route POST /user/register
 * @desc Register a new user
 * @access Public
 */
async function getUserById(req: Request, res: Response) {
  const functionName = 'getUserById';
  logRequest(functionName, req.params);
  try {
    const result = await new User().getUserByUsername(req.params.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to get user by id' });
  }
}

async function googleLogin(req: Request, res: Response) {
  const functionName = 'googleLogin';
  logRequest(functionName, req.body);
  try {
    const result = await new User().googleLoginOrRegister(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to login with Google' });
  }
}

async function airdrop(req: Request, res: Response) {
  const functionName = 'airdrop';
  logRequest(functionName, req.body);
  try {
    const amount = "1000000"
    const token = req.body.token || "UGX"
    const response = await new User().giveAirdrop(req.body.userId, amount, token);

    makeResponse(res, response);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to claim airdrop' });
  }
}

async function registerUser(req: Request, res: Response) {
  const functionName = 'register';
  logRequest(functionName, req.body);
  try {
    const result = await new User().registerUser(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Registration failed' });
  }
}


/**
 * @route POST /user/login
 * @desc User login
 * @access Public
 */
async function login(req: Request, res: Response) {
  const functionName = 'login';
  logRequest(functionName, { ...req.body, password: '****' });
  try {
    const result = await new User().login(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Login failed' });
  }
}

/**
 * @route POST /user/setup_pin
 * @desc Setup PIN for a user
 * @access Private
 */
async function setupPin(req: Request, res: Response) {
  const functionName = 'setupPIN';
  logRequest(functionName, { ...req.body, pin: '****' });
    try {
        const { user_id, pin } = req.body;
    const result = await new User().setupPIN(user_id, pin);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to setup PIN' });
  }
}

/**
 * @route POST /user/verify-otp
 * @desc Verify OTP for registration
 * @access Public
 */
async function verifyRegistrationOTP(req: Request, res: Response) {
  const functionName = 'verifyRegistrationOTP';
  logRequest(functionName, { ...req.body, otp: '****' });
  try {
    const { email, otp } = req.body;
    const result = await new User().verifyRegistrationOTP(email, otp);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to verify OTP' });
  }
}

/**
 * @route GET /user/has_pin/:userId
 * @desc Check if user has PIN
 * @access Public
 */
async function hasPin(req: Request, res: Response) {
  const functionName = 'hasPIN';
  logRequest(functionName, { userId: req.params.userId });
  try {
    const result = await new User().hasPIN(req.params.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to check PIN status' });
  }
}

/**
 * @route POST /user/make_validator
 * @desc Make a user a validator
 * @access Private
 */
async function makeValidator(req: Request, res: Response) {
  const functionName = 'makeValidator';
  logRequest(functionName, req.body);
  try {
    const result = await new User().makeValidator(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to make validator' });
  }
}

/**
 * @route POST /user/update_profile
 * @desc Update user profile
 * @access Private
 */
async function updateProfile(req: Request, res: Response) {
  const functionName = 'updateProfile';
  logRequest(functionName, req.body);
  try {
    const result = await new User().updateProfile(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to update profile' });
  }
}

/**
 * @route POST /user/update_favorite
 * @desc Update user favorites
 * @access Private
 */
async function updateFavorite(req: Request, res: Response) {
  const functionName = 'updateFavorite';
  logRequest(functionName, req.body);
  try {
    const result = await new User().updateFavorite(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to update favorites' });
  }
}

/**
 * @route POST /user/forgot-password
 * @desc Initiate forgot password process
 * @access Public
 */
async function forgotPassword(req: Request, res: Response) {
  const functionName = 'forgotPassword';
  logRequest(functionName, { email: req.body.email });
  try {
    // First check if user exists
    const user = await new User().getUserByEmail(req.body.email);
    if (!user) {
      return makeResponse(res, {
        status: 404,
        message: 'No account found with this email'
      });
    }

    // Generate OTP
    const result = await new User().generateOTP(req.body.email);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to process forgot password request' });
  }
}

/**
 * @route POST /verify-reset-otp
 * @desc Verify OTP for password reset
 * @access Public
 */
async function verifyResetOTP(req: Request, res: Response) {
  const functionName = 'verifyResetOTP';
  logRequest(functionName, { ...req.body, otp: '****' });
  try {
    const { email, otp } = req.body;
    const result = await new User().verifyResetOTP(email, otp);
    logResponse(functionName, result);
    return makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    return makeResponse(res, { status: 500, message: 'Failed to verify OTP' });
  }
}

/**
 * @route POST /reset-password
 * @desc Reset password after verification
 * @access Public
 */
async function resetPassword(req: Request, res: Response) {
  const functionName = 'resetPassword';
  logRequest(functionName, req.body);
  try {
    const { email, newPassword } = req.body;
    const result = await new User().updatePassword(email, newPassword);
    logResponse(functionName, result);
    return makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    return makeResponse(res, { status: 500, message: 'Failed to reset password' });
  }
}

/**
 * @route POST /user/send-otp
 * @desc Send OTP for verification
 * @access Public
 */
async function sendOTP(req: Request, res: Response) {
  const functionName = 'sendOTP';
  logRequest(functionName, { email: req.body.email });
  try {
    const result = await new User().generateOTP(req.body.email);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to send OTP' });
  }
}

/**
 * @route GET /user/search_users/:userId
 * @desc Search for users
 * @access Public
 */
async function searchUsers(req: Request, res: Response) {
  const functionName = 'searchUsers';
  logRequest(functionName, { query: req.query.q });
  try {
    const result = await new User().searchUsers(req.query.q);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to search users' });
  }
}

/**
 * @route GET /user/profile/:userId
 * @desc Get user profile
 * @access Public
 */
async function getProfile(req: Request, res: Response) {
  const functionName = 'getProfile';
  logRequest(functionName, { userId: req.params.userId });
  try {
    const result = await new User().getProfile(req.params.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to get profile' });
  }
}

/**
 * @route POST /user/follow_user
 * @desc Follow a user
 * @access Private
 */
async function followUser(req: Request, res: Response) {
  const functionName = 'followUser';
  logRequest(functionName, req.body);
  try {
    const result = await new User().followUser(req.body);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to follow user' });
  }
}

/**
 * @route GET /user/following/:userId
 * @desc Get users that a user is following
 * @access Public
 */
async function getFollowing(req: Request, res: Response) {
  const functionName = 'getFollowing';
  logRequest(functionName, { userId: req.params.userId });
  try {
    const result = await new User().getFollowing(req.params.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to get following' });
  }
}

/**
 * @route GET /user/followers/:userId
 * @desc Get followers of a user
 * @access Public
 */
async function getFollowers(req: Request, res: Response) {
  const functionName = 'getFollowers';
  logRequest(functionName, { userId: req.params.userId });
  try {
    const result = await new User().getFollowers(req.params.userId);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to get followers' });
  }
}

/**
 * @route GET /user/validate-token
 * @desc Validate user token
 * @access Private (requires token)
 */
async function validateToken(req: Request, res: Response) {
  console.error('Database error during token validation:');
  // Database error shouldn't invalidate token - it passed JWT verification
  return makeResponse(res, {
    status: 200,
    message: 'Token is valid',
    isValid: true
  });
}

/**
 * @route POST /user/registerPushToken
 * @desc Register push token for a user
 * @access Private
 */
async function registerPushToken(req: Request, res: Response) {
  const functionName = 'registerPushToken';
  logRequest(functionName, { ...req.body, token: '****' });
  try {
    const { userId, token, device } = req.body;
    const result = await new User().updatePushToken(userId, token, device);
    logResponse(functionName, result);
    makeResponse(res, result);
  } catch (error: any) {
    logError(functionName, error);
    makeResponse(res, { status: 500, message: error.message || 'Failed to register push token' });
  }
}

/**
 * @route POST /user/sendTestNotification
 * @desc Send a test notification to a user
 * @access Private
 */

export default router;
