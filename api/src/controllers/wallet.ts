import { Router, Request, Response } from 'express';
import { refreshRequired, tokenRequired } from '../middleware/auth';
import { Wallet } from '../models/Wallet';

const router = Router();
router.get('/balance/:token', tokenRequired, getBalance);
router.get('/statement', tokenRequired, getStatement);
router.get('/keys', tokenRequired, getKeys);
router.get('/deposit/addresses', tokenRequired, getDepositAddresses);
router.get('/balances', tokenRequired, getBalances);

router.post('/webhook_rel', webhookRel);
router.post('/webhook', webhook);
router.post('/cryptoWebhook', cryptoWebhook);
router.get('/getBalance', tokenRequired, getBalance);
router.get('/accountStatement', tokenRequired, accountStatement);
router.post('/depositRequest', tokenRequired, depositRequest);
router.post('/stableCoinDeposit', tokenRequired, stableCoinDeposit);
router.get('/getSupportedAssets', tokenRequired, getSupportedAssets);

router.post('/transferRequest', tokenRequired, transferRequest);
router.post('/payMerchant', tokenRequired, payMerchant);
router.post('/validateMerchant', tokenRequired, validateMerchant);

router.get('/getWallets', tokenRequired, getWallets);
router.get('/getPaymentTypes', tokenRequired, getPaymentTypes);
router.get('/queryPaymentTypes', tokenRequired, getPaymentTypesv2);

router.post('/addPaymentMethod', tokenRequired, addPaymentMethod);
router.get('/getUserPaymentMethods', tokenRequired, getUserPaymentMethods);
router.get('/deletePaymentMethod/:id', tokenRequired, deletePaymentMethod);

router.post('/validatAccount', tokenRequired, validateUserAccount);
router.post('/setTransactionPin', tokenRequired, setTransactionPin);
router.post('/withdrawRequest', tokenRequired, withdrawRequest);
router.post('/resetTransactionPin', tokenRequired, resetTransactionPin);

router.post('/issueTokens', tokenRequired, issueTokens);

router.post('/getExchangeRate', tokenRequired, getExchangeRate);
router.get('/getTransactionById/:id', getTransactionById);

// Swap endpoints
router.get('/swapRate', tokenRequired, getSwapRate);
router.post('/swap', tokenRequired, performSwap);

// Airdrop and Tasks endpoints
router.get('/getAirdropTasks', tokenRequired, getAirdropTasks);
router.post('/claimAirdrop', tokenRequired, claimAirdrop);
router.post('/verifyAirdropTask', tokenRequired, verifyAirdropTask);
router.get('/userTaskHistory', tokenRequired, userTaskHistory);

router.post('/pinlogin', refreshRequired, pinlogin);



/**
 * @route GET /wallet/deposit/addresses
 * @desc Get user deposit addresses for multiple chains
 * @access Private
 */
async function pinlogin(req: Request, res: Response) {
    try {
        const result = await new Wallet().login(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error processing pin login', error });
    }
}
async function getDepositAddresses(req: Request, res: Response) {
    try {
        const { userId } = req.body;
        console.log(`Deposit addresses requested for user ${userId}`);

        if (!userId) {
            return res.status(401).json({
                status: 401,
                message: 'Unauthorized: User not authenticated'
            });
        }

        // Use the Wallet model's getDepositAddresses method
        const result = await new Wallet().getDepositAddresses(userId);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Deposit addresses error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while fetching deposit addresses'
        });
    }
};

async function userTaskHistory(req: Request, res: Response) {
    const result = await new Wallet().getUserTaskHistory(req.body.userId);
    res.status(200).json(result);
}

async function issueTokens(req: Request, res: Response) {
    try {
        const result = await new Wallet().issueTokens(req.body.transId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error issuing tokens', error });
    }
}

async function validateUserAccount(req: Request, res: Response) {
    try {
        const result = await new Wallet().validateUserAccount(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error validating user account', error });
    }
}
async function getTransactionById(req: Request, res: Response) {
    try {
        const result = await new Wallet().getTransactionById(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transaction by ID', error });
    }
}
async function withdrawRequest(req: Request, res: Response) {
    try {
        new Wallet().saveLog("WITHDRAW_REQUEST", req.body);
        const result = await new Wallet().transferRequest(req.body);
        new Wallet().saveLog("WITHDRAW_REQUEST_RESPONSE", result);
        res.status(200).json(result);
    } catch (error) {
        new Wallet().saveLog("WITHDRAW_REQUEST_ERROR", error);
        res.status(500).json({ message: 'Error processing withdrawal request', error });
    }
}

async function validateMerchant(req: Request, res: Response) {
    try {
        const result = await new Wallet().validateMerchant(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error validating merchant', error });
    }
}
async function payMerchant(req: Request, res: Response) {
    try {
        const result = await new Wallet().payMerchant(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error processing merchant payment', error });
    }
}

async function getExchangeRate(req: Request, res: Response) {
    try {
        const result = await new Wallet().getExchangeRate(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exchange rate', error });
    }
}

async function setTransactionPin(req: Request, res: Response) {
    try {
        const result = await new Wallet().setTransactionPin(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error setting transaction PIN', error });
    }
}

async function resetTransactionPin(req: Request, res: Response) {
    try {
        const result = await new Wallet().resetTransactionPIN(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error resetting transaction PIN', error });
    }
}

async function deletePaymentMethod(req: Request, res: Response) {
    try {
        const result = await new Wallet().deletePaymentMethod(req.params.id, req.body.userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting payment method', error });
    }
}

async function addPaymentMethod(req: Request, res: Response) {
    try {
        const result = await new Wallet().addPaymentMethod(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error adding payment method', error });
    }
}

async function getUserPaymentMethods(req: Request, res: Response) {
    try {
        const result = await new Wallet().getUserPaymentMethods(req.query, req.body.userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment methods', error });
    }
}

async function getPaymentTypesv2(req: Request, res: Response) {
    try {
        const iso_code = typeof req.query.iso_code === 'string' ? req.query.iso_code : 'ALL';
        const operation = typeof req.query.operation === 'string' ? req.query.operation : 'ALL';
        const result = await new Wallet().getPaymentTypesv2(operation, iso_code);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment methods', error });
    }
}

async function getPaymentTypes(req: Request, res: Response) {
    try {
        const iso_code = typeof req.query.iso_code === 'string' ? req.query.iso_code : 'ALL';
        const operation = typeof req.query.operation === 'string' ? req.query.operation : 'ALL';
        const result = await new Wallet().getPaymentTypes(operation, iso_code);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment methods', error });
    }
}

async function webhookRel(req: Request, res: Response) {
    try {
        new Wallet().saveLog("RELWORX_WEBHOOK", req.body);
        const result = await new Wallet().webhookRel(req.body);
        new Wallet().saveLog("RELWORX_WEBHOOK_RESPONSE", result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching balance', error });
    }
}

async function accountStatement(req: Request, res: Response) {
    try {
        const result = await new Wallet().getTransactionStatement(req.body, req.query.currency as string);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching account statement', error });
    }
}

async function depositRequest(req: Request, res: Response) {
    try {
        const result = await new Wallet().depositRequest(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error processing deposit request', error });
    }
}

async function stableCoinDeposit(req: Request, res: Response) {
    try {
        const result = await new Wallet().stableCoinDeposit(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error processing stable coin deposit', error });
    }
}

async function getSupportedAssets(req: Request, res: Response) {
    try {
        const result = await new Wallet().getSupportedAssets();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching supported assets', error });
    }
}


async function transferRequest(req: Request, res: Response) {
    try {
        new Wallet().saveLog("TRANSFER_REQUEST", req.body);
        const result = await new Wallet().transferRequest(req.body);
        new Wallet().saveLog("TRANSFER_REQUEST_RESPONSE", result);
        res.status(200).json(result);
    } catch (error) {
        new Wallet().saveLog("TRANSFER_REQUEST_ERROR", error);
            res.status(500).json({ message: 'Error processing transfer request', error });
    }
}

async function getWallets(req: Request, res: Response) {
    try {
        const result = await new Wallet().GetWallet(req.body.userId, "USD");
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallets', error });
    }
}

async function cryptoWebhook(req: Request, res: Response) {
    try {
        const result = await new Wallet().cryptoWebhook(req.body);
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying phone', error });
    }
}
async function webhook(req: Request, res: Response) {
    try {
        const result = await new Wallet().HandleWebhook(req);
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying phone', error });
    }
}

async function getBalances(req: Request, res: Response) {
    try {
        const { userId } = req.body;
        console.log(`Wallet balances requested for user ${userId}`);

        const result = await new Wallet().getBalances(userId);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Wallet balances error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while fetching wallet balances'
        });
    }
}

async function getBalance(req: Request, res: Response) {
    try {
        const { userId } = req.body;
        console.log(`Wallet balance requested for user ${userId}`);

        const result = await new Wallet().getBalance(req.body, req.params.token);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Wallet balance error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while fetching wallet balance'
        });
    }
};

/**
 * @route GET /wallet/statement/:userId
 * @desc Get user transaction statement
 * @access Private
 */
async function getStatement(req: Request, res: Response) {
    try {
        const { userId } = req.body;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        console.log(`Wallet statement requested for user ${userId}, limit: ${limit}, offset: ${offset}`);

        const result = await new Wallet().getStatement(userId, limit, offset);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Wallet statement error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while fetching wallet statement'
        });
    }
};

/**
 * @route GET /wallet/keys/:userId
 * @desc Get user wallet keys (public only)
 * @access Private
 */
async function getKeys(req: Request, res: Response) {
    try {
        const { userId } = req.body;
        console.log(`Wallet keys requested for user ${userId}`);

        const result = await new Wallet().getKeys(userId);
        return res.status(result.status).json(result);
    } catch (error) {
        console.error('Wallet keys error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while fetching wallet keys'
        });
    }
};

/**
 * Get all available airdrop tasks
 */
async function getAirdropTasks(req: Request, res: Response) {
    try {
        const tasks = await new Wallet().getAirdropTasks();
        return res.json({
            status: 200,
            message: "Airdrop tasks retrieved successfully",
            data: tasks.data
        });
    } catch (error: any) {
        console.error('Error getting airdrop tasks:', error);
        return res.status(500).json({
            status: 500,
            message: error.message || 'Failed to get airdrop tasks'
        });
    }
}

/**
 * Claim an airdrop by submitting proof of task completion
 */
async function claimAirdrop(req: Request, res: Response) {
    try {
        const userId = req.userId || '';
        const { taskId, platform, url } = req.body;

        if (!userId) {
            return res.status(401).json({
                status: 401,
                message: 'Unauthorized: User not authenticated'
            });
        }

        if (!taskId || !platform || !url) {
            return res.status(400).json({
                status: 400,
                message: 'Missing required fields: taskId, platform, url'
            });
        }

        const result = await new Wallet().claimAirdrop(userId, taskId, platform, url);
        return res.json(result);
    } catch (error: any) {
        console.error('Error claiming airdrop:', error);
        return res.status(500).json({
            status: 500,
            message: error.message || 'Failed to claim airdrop'
        });
    }
}

/**
 * Verify an airdrop task
 * This is an admin endpoint to approve/reject task claims
 */
async function verifyAirdropTask(req: Request, res: Response) {
    try {
        const userId = req.userId || '';
        const { performedTaskId, status, notes } = req.body;

        if (!userId) {
            return res.status(401).json({
                status: 401,
                message: 'Unauthorized: User not authenticated'
            });
        }

        if (!performedTaskId || !status) {
            return res.status(400).json({
                status: 400,
                message: 'Missing required fields: performedTaskId, status'
            });
        }

        // TODO: Add admin check here
        // if (!isAdmin(userId)) {
        //   return res.status(403).json({
        //     status: 403,
        //     message: 'Unauthorized: Admin access required'
        //   });
        // }

        const result = await new Wallet().verifyAirdropTask(performedTaskId, status, notes);
        return res.json(result);
    } catch (error: any) {
        console.error('Error verifying airdrop task:', error);
        return res.status(500).json({
            status: 500,
            message: error.message || 'Failed to verify airdrop task'
        });
    }
}

/**
 * @route GET /wallet/swapRate
 * @desc Get exchange rate for token swap
 * @access Private
 */
async function getSwapRate(req: Request, res: Response) {
    try {
        const { fromAsset, toAsset, amount } = req.query;
        const { userId } = req.body;

        console.log(`Swap rate requested for ${amount} ${fromAsset} to ${toAsset} by user ${userId}`);

        if (!fromAsset || !toAsset || !amount) {
            return res.status(400).json({
                status: 400,
                message: 'Missing required parameters: fromAsset, toAsset, amount'
            });
        }

        // For now, provide default rates based on known pairs
        // This should be replaced with actual exchange rate logic
        let rate: number;

        if (fromAsset === 'SBX' && toAsset === 'UGX') {
            rate = 3500; // Example rate
        } else if (fromAsset === 'UGX' && toAsset === 'SBX') {
            rate = 1 / 3500; // Example rate
        } else {
            rate = 1; // Default 1:1 rate for other pairs
        }

        return res.status(200).json({
            status: 200,
            message: 'Swap rate calculated successfully',
            data: {
                fromAsset,
                toAsset,
                amount,
                rate
            }
        });

        // Once the Wallet model implements getSwapRate, use this instead:
        // const result = await new Wallet().getSwapRate(fromAsset, toAsset, amount);
        // return res.status(result.status).json(result);
    } catch (error) {
        console.error('Swap rate error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while calculating swap rate'
        });
    }
}

/**
 * @route POST /wallet/swap
 * @desc Swap tokens from one currency to another
 * @access Private
 */
async function performSwap(req: Request, res: Response) {
    try {
        const { fromAsset, toAsset, amount } = req.body;
        const { userId } = req.body;

        console.log(`Swap requested: ${amount} ${fromAsset} to ${toAsset} by user ${userId}`);

        if (!fromAsset || !toAsset || !amount) {
            return res.status(400).json({
                status: 400,
                message: 'Missing required parameters: fromAsset, toAsset, amount'
            });
        }

        if (fromAsset === toAsset) {
            return res.status(400).json({
                status: 400,
                message: 'Cannot swap to the same asset type'
            });
        }

        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                status: 400,
                message: 'Amount must be a positive number'
            });
        }

        // Once the Wallet model implements swap, use this:
        // const result = await new Wallet().swap(userId, fromAsset, toAsset, amount);
        // return res.status(result.status).json(result);

        // For now, return a mock success response
        return res.status(200).json({
            status: 200,
            message: 'Swap completed successfully',
            data: {
                fromAsset,
                toAsset,
                amountSwapped: amount,
                receivedAmount: amount * (fromAsset === 'SBX' && toAsset === 'UGX' ? 3500 :
                    fromAsset === 'UGX' && toAsset === 'SBX' ? 1 / 3500 : 1),
                transactionId: `SWAP-${Date.now()}`
            }
        });
    } catch (error) {
        console.error('Swap error:', error);
        return res.status(500).json({
            status: 500,
            message: 'Server error while processing swap'
        });
    }
}

export default router;
