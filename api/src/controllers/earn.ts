import { Router, Request, Response } from 'express';
import { tokenRequired } from '../middleware/auth';
import { Bet } from '../models/bets';
import Modal from '../libs/modal';

const router = Router();

// Jackpot routes
router.get('/jackpot/details', getJackpotDetails);
router.post('/jackpot/join', tokenRequired, joinJackpot);

// Referral routes  
router.get('/referral-stats', tokenRequired, getReferralStats);
router.post('/referral/process', tokenRequired, processReferral);

interface JackpotRound {
    id: number;
    title: string;
    description: string;
    entry_fee: number;
    total_prize: number;
    participants_count: number;
    status: string;
    end_time: Date;
}

interface JackpotQuestion {
    id: number;
    topic_id: string;
    question_text: string;
    question_type: string;
    hint: string;
    min_value: number;
    max_value: number;
    order_position: number;
}

class EarnService extends Modal {
    
    async getActiveJackpot(): Promise<any> {
        try {
            // Get active jackpot topic (reusing existing topic system)
            const jackpotTopics: any = await this.callQuery(
                `SELECT t.*, jr.title as round_title, jr.description as round_description, 
                        jr.entry_fee, jr.total_prize, jr.participants_count, jr.end_time as round_end_time
                 FROM sia_topic t 
                 JOIN jackpot_rounds jr ON t.jackpot_round_id = jr.id 
                 WHERE t.is_jackpot = 'yes' AND t.topic_status = 'active' AND jr.status = 'active'
                 ORDER BY t.uploaded_on DESC LIMIT 1`
            );
            
            if (!Array.isArray(jackpotTopics) || jackpotTopics.length === 0) {
                return this.makeResponse(404, "No active jackpot found");
            }
            
            const topic = jackpotTopics[0];
            
            // Get questions for this jackpot topic
            const questions: any = await this.callQuery(
                `SELECT id, question_text, question_type, hint, min_value, max_value, order_position 
                 FROM jackpot_questions WHERE topic_id = '${topic.topic_id}' ORDER BY order_position`
            );
            
            const questionsList = Array.isArray(questions) ? questions : [];
            
            // Calculate time remaining
            const now = new Date();
            const endTime = new Date(topic.round_end_time || topic.topic_end_date);
            const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
            
            return this.makeResponse(200, "Active jackpot retrieved successfully", {
                round: {
                    id: topic.jackpot_round_id,
                    topic_id: topic.topic_id,
                    title: topic.round_title,
                    description: topic.round_description,
                    entry_fee: topic.entry_fee,
                    total_prize: topic.total_prize,
                    participants_count: topic.participants_count,
                    time_remaining: timeRemaining,
                    status: topic.topic_status
                },
                questions: questionsList
            });
        } catch (error) {
            console.error('Get active jackpot error:', error);
            return this.makeResponse(500, "Failed to get active jackpot");
        }
    }
    
    async joinJackpot(userId: string, answers: any[], topicId?: string): Promise<any> {
        try {
            if (!answers || !Array.isArray(answers) || answers.length !== 5) {
                return this.makeResponse(400, "Exactly 5 answers are required");
            }
            
            // Get active jackpot topic if no topicId provided
            let targetTopicId = topicId;
            if (!targetTopicId) {
                const activeJackpot = await this.getActiveJackpot();
                if (activeJackpot.status !== 200) {
                    return activeJackpot;
                }
                targetTopicId = activeJackpot.data.round.topic_id;
            }
            
            // Check if user already participated (check if they have a bet on this topic)
            const existingBets: any = await this.callQuery(
                `SELECT bet_id FROM sia_bets WHERE user_id = '${userId}' AND topic_id = '${targetTopicId}'`
            );
            
            if (Array.isArray(existingBets) && existingBets.length > 0) {
                return this.makeResponse(400, "You have already joined this jackpot");
            }
            
            // Get topic details
            const topics: any = await this.callQuery(
                `SELECT t.*, jr.entry_fee FROM sia_topic t 
                 JOIN jackpot_rounds jr ON t.jackpot_round_id = jr.id 
                 WHERE t.topic_id = '${targetTopicId}' AND t.is_jackpot = 'yes'`
            );
            
            if (!Array.isArray(topics) || topics.length === 0) {
                return this.makeResponse(404, "Jackpot topic not found");
            }
            
            const topic = topics[0];
            const entryFee = topic.entry_fee;
            
            // Use existing Bet model to create a jackpot entry (reusing infrastructure!)
            const betsModel = new Bet();
            
            // Prepare bet data - store answers as JSON in bet choice
            const betData = {
                user_id: userId,
                topic_id: targetTopicId,
                stake_amount: entryFee,
                bet_choice: 'jackpot', // Special identifier for jackpot bets
                bet_details: JSON.stringify(answers), // Store answers here
                opponent_user_id: 'JACKPOT', // Special opponent for jackpot
                bet_type: 'jackpot',
                answer: 'yes' // Required field for bet system
            };
            
            // Create the bet (this reuses all existing payment/validation logic)
            const betResult = await betsModel.placeBet(betData);
            
            if (betResult.status !== 200) {
                return betResult;
            }
            
            // Update round participants count
            await this.callQuery(`
                UPDATE jackpot_rounds 
                SET participants_count = participants_count + 1,
                    total_prize = total_prize + ${entryFee}
                WHERE id = ${topic.jackpot_round_id}
            `);
            
            return this.makeResponse(200, "Successfully joined the jackpot!", {
                bet_id: (betResult as any).bet_id || 'generated',
                entry_fee_paid: entryFee
            });
            
        } catch (error) {
            console.error('Join jackpot error:', error);
            return this.makeResponse(500, "Failed to join jackpot");
        }
    }
    
    // Referral functionality
    async getReferralStats(userId: string): Promise<any> {
        try {
            let referralStats: any = await this.callQuery(
                `SELECT * FROM user_referral_stats WHERE user_id = '${userId}'`
            );
            
            if (!Array.isArray(referralStats) || referralStats.length === 0) {
                // Create referral code and initial stats
                const referralCode = this.generateReferralCode(userId);
                const statsData = {
                    user_id: userId,
                    referral_code: referralCode,
                    total_referrals: 0,
                    active_referrals: 0,
                    total_commission: 0.00,
                    this_month_commission: 0.00,
                    total_wins: 0,
                    accuracy_percentage: 75.0 + Math.random() * 20 // Demo data
                };
                
                await this.insertData('user_referral_stats', statsData);
                referralStats = [statsData];
            }
            
            const stats = referralStats[0];
            
            // Calculate global rank
            const rankQuery: any = await this.callQuery(
                `SELECT COUNT(*) + 1 as rank FROM user_referral_stats 
                 WHERE total_referrals > ${stats.total_referrals}`
            );
            
            const globalRank = Array.isArray(rankQuery) && rankQuery.length > 0 ? rankQuery[0].rank : 1;
            
            return this.makeResponse(200, "Referral stats retrieved successfully", {
                referral_code: stats.referral_code,
                total_referrals: stats.total_referrals,
                active_referrals: stats.active_referrals,
                total_commission: stats.total_commission,
                this_month_commission: stats.this_month_commission,
                total_wins: stats.total_wins,
                global_rank: globalRank,
                accuracy_percentage: stats.accuracy_percentage
            });
            
        } catch (error) {
            console.error('Get referral stats error:', error);
            return this.makeResponse(500, "Failed to get referral stats");
        }
    }
    
    async processReferral(referrerCode: string, newUserId: string): Promise<any> {
        try {
            const referrers: any = await this.callQuery(
                `SELECT user_id FROM user_referral_stats WHERE referral_code = '${referrerCode}'`
            );
            
            if (!Array.isArray(referrers) || referrers.length === 0) {
                return this.makeResponse(404, "Invalid referral code");
            }
            
            const referrerId = referrers[0].user_id;
            
            // Create referral record
            const referralData = {
                referrer_user_id: referrerId,
                referred_user_id: newUserId,
                referral_code: referrerCode,
                is_active: true,
                commission_earned: 0.00
            };
            
            await this.insertData('user_referrals', referralData);
            
            // Update referrer stats
            await this.callQuery(`
                UPDATE user_referral_stats 
                SET total_referrals = total_referrals + 1,
                    active_referrals = active_referrals + 1
                WHERE user_id = '${referrerId}'
            `);
            
            return this.makeResponse(200, "Referral processed successfully");
            
        } catch (error) {
            console.error('Process referral error:', error);
            return this.makeResponse(500, "Failed to process referral");
        }
    }
    
    private generateReferralCode(userId: string): string {
        const timestamp = Date.now().toString().slice(-6);
        const userIdPart = userId.slice(-3);
        return `REF${userIdPart}${timestamp}`.toUpperCase();
    }
}

// Helper function for responses
const makeResponse = (res: Response, result: any) => {
    return res.status(200).json(result);
};

// Route handlers
async function getJackpotDetails(req: Request, res: Response) {
    try {
        const earnService = new EarnService();
        const result = await earnService.getActiveJackpot();
        makeResponse(res, result);
    } catch (error: any) {
        makeResponse(res, { status: 500, message: error.message || 'Failed to get jackpot details' });
    }
}

async function joinJackpot(req: Request, res: Response) {
    try {
        const { answers, topic_id } = req.body;
        const userId = (req as any).user?.user_id;
        
        if (!userId) {
            return makeResponse(res, { status: 401, message: 'User not authenticated' });
        }
        
        const earnService = new EarnService();
        const result = await earnService.joinJackpot(userId, answers, topic_id);
        makeResponse(res, result);
    } catch (error: any) {
        makeResponse(res, { status: 500, message: error.message || 'Failed to join jackpot' });
    }
}

async function getReferralStats(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.user_id;
        
        if (!userId) {
            return makeResponse(res, { status: 401, message: 'User not authenticated' });
        }
        
        const earnService = new EarnService();
        const result = await earnService.getReferralStats(userId);
        makeResponse(res, result);
    } catch (error: any) {
        makeResponse(res, { status: 500, message: error.message || 'Failed to get referral stats' });
    }
}

async function processReferral(req: Request, res: Response) {
    try {
        const { referral_code } = req.body;
        const userId = (req as any).user?.user_id;
        
        if (!userId || !referral_code) {
            return makeResponse(res, { status: 400, message: 'User ID and referral code required' });
        }
        
        const earnService = new EarnService();
        const result = await earnService.processReferral(referral_code, userId);
        makeResponse(res, result);
    } catch (error: any) {
        makeResponse(res, { status: 500, message: error.message || 'Failed to process referral' });
    }
}

export default router; 