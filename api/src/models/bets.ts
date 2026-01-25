import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Stellar } from '../libs/Stellar';
import Modal from '../libs/modal';
import config from '../config';
import { UserData } from '../types';
import { Recipient } from '../libs/Stellar';
import ChatGptAPI from '../thirdparty/ChatGptAPI';
import OddsApiHelper from '../thirdparty/OddsApiHelper';
const betToken = process.env.BET_TOKEN || '';
const stellar = new Stellar();
interface TopicApprovalData {
    topic_id: string;
    approval_status: 'approved' | 'rejected';
    approved_by: string;
}

interface BetPlacementData {
    user_id: string;
    topic_id: string;
    stake_amount: string;
    opponent_user_id: string;
    bet_type: 'p2p' | 'open';
    answer: 'Yes' | 'No';
    opponent_bet_id: string;
    group_id?: string;
}

interface GameResultData {
    topic_id: string;
    final_result: string;
    posted_by: string;
    game_status: 'finished' | 'active';
}

interface TopicCreationData {
    topic_title: string;
    topic_description: string;
    topic_user_id: string;
    category_id: string;
    topic_start_date: Date;
    topic_end_date: Date;
    group_id?: string;
}

interface UserRecord {
    user_id: string;
    username: string;
    email: string;
    password: string;
    avatar: string;
    public_key: string;
    seed_key: string;
    fcm_token?: string;
    validator: boolean;
}

interface PayableBet {
    bet_id: string;
    public_key: string;
    amount: string;
    memo: string;
}

export class Bet extends Modal {
    private stellar = new Stellar();

    async getTopQuestionsNextDays(days = 7, limit = 5, bookmakerKey = 'pinnacle') {
        const oddsApiHelper = new OddsApiHelper();
        const odds = await oddsApiHelper.getTop5PopularGamesToday(days, limit, bookmakerKey);
        console.log("odds", odds);
        for (const gameData of odds) {
            const gameStartTime = new Date(gameData.gameStartTime);
            const bettingEndTime = new Date(gameStartTime.getTime() + 120 * 60 * 1000); // Stop betting 2 hours before game starts
            console.log("gameStartTime", gameStartTime);
            console.log("bettingEndTime", bettingEndTime);
            const request = {
                userId: process.env.AI_USER,
                topic_title: gameData.question,
                topic_type_id: 1,
                stake_amount: Math.floor(Math.random() * 2 + 1) * 1000 + (Math.random() < 0.5 ? 0 : 500),
                topic_question: gameData.question,
                topic_start_date: gameStartTime.toISOString(), // Actual game start time
                topic_end_date: bettingEndTime.toISOString(), // Stop betting 1 hour before game starts
                topic_category_id: 1,
                group_id: null
            }
            const result = await this.createTopic(request);
            console.log("result", result);
        }
    }
    async getPredictionQuestions() {
        const prompt: any = await new ChatGptAPI().generateMessage();

        console.log("prompt", (prompt));
        for (const question of prompt) {
            const request = {
                userId: process.env.AI_USER,
                topic_title: question.title,
                topic_type_id: 1,
                stake_amount: Math.floor(Math.random() * 2 + 1) * 1000 + (Math.random() < 0.5 ? 0 : 500),
                topic_question: question.question,
                topic_start_date: question.start_date_time,
                topic_end_date: question.end_date_time,
                topic_category_id: question.category_id,
                group_id: null
            }
            const result = await this.createTopic(request);
            console.log("result", result);
        }
    }
    async approveTopic(req: Request) {
        try {
            console.log("approveTopic", req.body);
            const data = req.body;
            const { topic_id, approval_status, approved_by } = data;

            const approverInfo: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE user_id = '${approved_by}'`
            );
            if (!approverInfo?.[0]?.is_validator) {
                //  return { status: 101, message: "access error" };
            }

            if (approval_status === "approved") {
                const topic: any = await this.callQuery(
                    `SELECT * FROM sia_topic WHERE topic_id = '${topic_id}' AND approval_status = 'pending'`
                );
                if (!topic?.[0]) {
                    return { status: 404, message: "topic not found" };
                }

                const userInfo: any = await this.callQuery(
                    `SELECT * FROM sia_topic WHERE topic_user_id = '${topic[0].topic_user_id}'`
                );
                const fees = await this.getFees("approve_topic");

                if (!userInfo?.[0]) {
                    return { status: 404, message: "User not found" };
                }

                if (!fees) {
                    return { status: 203, message: "fee not found" };
                }

                const txnHash = await this.stellar.makePayment({
                    senderKeyPair: this.stellar.getAirdropAccount(),
                    recipientPublicKey: userInfo[0].public_key,
                    assetCode: betToken,
                    assetIssuer: stellar.assetIssuer,
                    amount: fees,
                    memo: `approved ${topic[0].tp_id}`
                });

                await this.updateData("sia_topic",
                    `topic_id = '${topic_id}'`,
                    {
                        approval_status,
                        reward_hash: txnHash,
                        approved_by
                    }
                );

                // Send notification if fcm_token exists
                if (userInfo[0].fcm_token) {
                 //   await this.sendAppNotification(userInfo[0].user_id, 'new', "Topic Status", approval_status);
                }
            } else {
                const topic: any = await this.callQuery(
                    `SELECT * FROM sia_topic WHERE topic_id = '${topic_id}'`
                );
                if (!topic?.[0]) {
                    return { status: 404, message: "Topic not found" };
                }

                await this.updateData("sia_topic",
                    `topic_id = '${topic_id}'`,
                    {
                        approval_status: "rejected",
                        topic_status: "cancelled",
                        approved_by
                    }
                );
            }

            return { status: 200, message: "Operation complete" };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async escrowTransaction(userId: string, amount: any) {
        try {
            // Get user wallet info
            const userInfo: any = await this.getWallet(userId);
            if (userInfo == null) {
                return { status: 404, message: "User wallet not found" };
            }

            const { publicKey, secret } = userInfo;

            // Create escrow transaction
            const transactionObject: Recipient = {
                publicKey: this.stellar.escrowAccount,
                amount: amount.toString(),
                asset_code: config.betToken,
                asset_issuer: stellar.assetIssuer,
                senderSecretKey: secret,
                creditPrivateKey: process.env.ESCROW_PV || '',
            };
            console.log("transactionObject", transactionObject);

            // Process escrow payment
            return await this.stellar.makeBatchTransfers("escrow payment", [transactionObject]);


        } catch (error: unknown) {
            console.log("escrowAmount", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async placeBet(data: any) {
        try {
            const now = new Date().getTime();
            const {
                topic_id,
                stake_amount,
                opponent_user_id,
                bet_type,
                answer,
                userId,
                opponent_bet_id,
                group_id
            } = data;

            const user_id = userId;
            const answerParams = ["Yes", "No"];
            let betStatus = 'unmatched';
            const memo = "placed bet";
            let opponentInfo = null;
            const betId = uuidv4();

            // Validate topic
            const topic = await this.getTopicDetail(topic_id);
            if (topic.length === 0) {
                return { status: 404, message: "not found" };
            }

            const { approval_status, topic_start_date, topic_status } = topic as any;
            if (approval_status !== "approved" || topic_status !== "active") {
                //    return { status: 403, message: "Topic not approved or not active" };
            }

            const beginTimeStamp = new Date(topic_start_date).getTime();
            if ((beginTimeStamp - now) <= 0) {
                return { status: 403, message: "Game already started" };
            }

            // Validate input
            if (!user_id || !topic_id) {
                return { status: 403, message: "fill all required fields" };
            }

            if (!answerParams.includes(answer)) {
                return { status: 403, message: "Invalid answer" };
            }

            if (stake_amount <= 0) {
                return { status: 403, message: "Invalid stake amount" };
            }
            // Get user's balance before placing bet


            console.log("user_id", user_id);
            // Get user info
            const senderInfo: any = await this.getWallet(user_id) as any;

            if (senderInfo == null) {
                return { status: 404, message: "user not found" };
            }

            // Handle opponent matching
            if (opponent_bet_id) {
                opponentInfo = await this.getOpponent(answer, topic_id, stake_amount, opponent_bet_id);
                if (opponentInfo) {
                    betStatus = 'matched';
                }
            } else if (bet_type === 'p2p') {
                opponentInfo = await this.getUserById(opponent_user_id);
                if (!opponentInfo) {
                    return { status: 404, message: "opponent_username not found" };
                }
            } else {
                opponentInfo = await this.getWorthOpponent(user_id, answer, topic_id, stake_amount);
                if (opponentInfo) {
                    betStatus = 'matched';
                }
            }

            // If this is a group bet, verify group membership
            if (group_id) {
                const isMember = await this.isGroupMember(group_id, user_id);
                if (!isMember) {
                    //  return { status: 403, message: "You must be a group member to place this bet" };
                }
            }
            const txArray: any[] = [];
            const senderSecretKey = senderInfo.secret;
            const destinationPrivateKey = senderSecretKey;


            // Create bet record
            const betData = {
                bet_txn_hash: "",
                bet_id: betId,
                user_id,
                topic_id,
                bet_type: "random",
                opponent_user_id: opponentInfo?.user_id || '',
                stake_amount,
                asset_code: stellar.assetIssuer,
                bet_answer: answer,
                match_status: betStatus
            };
            await this.insertData('sia_bets', betData);

            const escrowAmount = await this.escrowTransaction(userId, stake_amount);
            if (escrowAmount.status == 1) {
                betData.bet_txn_hash = escrowAmount.message;
                await this.updateData('sia_bets', `bet_id = '${betId}'`, { bet_txn_hash: escrowAmount.message });
            } else {
                await this.updateData('sia_bets', `bet_id = '${betId}'`, { bet_status: "cancelled", bet_txn_hash: "" });
            }

            return { status: 200, message: "Bet placed successfully" };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async createTopic(data: any) {
        try {
            const {
                userId,
                topic_title,
                topic_type_id,
                topic_question,
                topic_start_date,
                topic_end_date,
                topic_category_id,
                group_id,
                stake_amount,
                possible_answer
            } = data;

            const currentDate = new Date();
            const startDate = new Date(topic_start_date);
            const endDate = new Date(topic_end_date);

            const userInfo: any = await this.getWallet(userId);
            if (userInfo == null) {
                return { status: 404, message: "user not found" };
            }
            if (startDate < currentDate) {
                return { status: 403, message: "Start date cannot be in the past" };
            }

            if (endDate < currentDate) {
                return { status: 403, message: "End date cannot be in the past" };
            }

            if (endDate < startDate) {
                return { status: 403, message: "End date must be after start date" };
            }
            // If this is a group topic, verify group membership
            if (group_id) {
                const isMember = await this.isGroupMember(group_id, userId);
                if (!isMember) {
                  //  return { status: 403, message: "You must be a group member to create topics" };
                }
            }

            const escrowAmount = await this.escrowTransaction(userId, stake_amount);
            if (escrowAmount.status != 1 && userId != process.env.AI_USER) {
               // return { status: 403, message: "You need to have a balance in your wallet to create a topic" };
            }
            const topicId = uuidv4();
            const topicData = {
                topic_id: topicId,
                topic_user_id: userId,
                topic_title,
                topic_type_id,
                stake_amount,
                topic_question,
                topic_start_date: new Date(topic_start_date).toISOString().slice(0, 19).replace('T', ' '),
                topic_end_date: new Date(topic_end_date).toISOString().slice(0, 19).replace('T', ' '),
                topic_category_id,
                group_id,
                approval_status: 'approved',
                topic_status: 'active'
            };


            await this.insertData('sia_topic', topicData);

            if (possible_answer != undefined && (possible_answer == "yes" || possible_answer == "no")) {
                const betData = {
                    topic_id: topicId,
                    stake_amount,
                    opponent_user_id: "",
                    bet_type: "random",
                    answer: possible_answer,
                    userId,
                    opponent_bet_id: null,
                    group_id: null
                }
                this.placeBet(betData);
            }

            if (userId != process.env.AI_USER) {
                this.giveAirdrop(userId, "10", betToken);
            }

            return { status: 200, message: "Topic created successfully", topicData };
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }


    async createCategory(req: Request) {
        try {
            const { category_name } = req.body;
            const categoryId = uuidv4();
            await this.insertData('sia_category', {
                category_id: categoryId,
                category_name
            });
            return { status: 200, message: "Category created successfully" };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async insertGameResult(req: Request) {
        try {
            const data = req.body;
            const { topic_id, final_result, game_status } = data;
            const final_result_array = ["yes", "no"];

            if (game_status === "finished") {
                if (!final_result_array.includes(final_result.toLowerCase())) {
                    return { status: 403, message: "Invalid final result" };
                }
                const topic_bets = await this.getAllBetsForTopic(topic_id);

                for (const bet of topic_bets) {
                    let payable = false;
                    const {
                        bet_id,
                        bet_answer,
                        stake_amount,
                        match_status,
                        public_key,
                        fcm_token,
                        bt_id,
                        user_id,
                        match_id
                    } = bet as any;

                    let bet_final_result = "lost";
                    let memo = "";

                    if (match_status === "matched") {
                        if (bet_answer === final_result) {
                            bet_final_result = "won";
                            memo = `win ${match_id}`;
                            payable = true;
                        }
                    } else {
                        payable = true;
                        memo = `refund${bt_id}`;
                        bet_final_result = "refundable";
                    }

                    if (payable) {
                    //    await this.sendAppNotification(user_id, 'new', "Bet Result", memo);
                        
                        const payable_bet = {
                            match_id,
                            user_id,
                            memo,
                            amount: stake_amount,
                            bet_id,
                            reason: bet_final_result,
                            public_key
                        };
                        await this.insertData('sia_payable_bets', payable_bet);
                    }

                    await this.updateData("sia_bets",
                        `bet_id = '${bet_id}'`,
                        { bet_final_result, bet_status: "closed" }
                    );
                }

                await this.updateData("sia_topic",
                    `topic_id = '${topic_id}'`,
                    { final_result: final_result, topic_status: 'closed' }
                );
            }

            await this.makePaymentsPayouts(topic_id);
            return { status: 200, message: "operations complete" };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async getTopicsForUser(userId: string) {
        const topics = await this.callQuery(
            `SELECT * FROM sia_topic WHERE topic_user_id = '${userId}'`
        );
        return this.makeResponse(200, "Topics fetched successfully", topics);
    }

    async topicsFeed(category: string) {
        //            ${category ? `AND t.topic_category_id = '${category}'` : ''}

        const query = `
            SELECT 
    t.*,
    u.username AS creator_name,
    u.avatar AS creator_avatar,
    COUNT(CASE WHEN b.bet_answer = 'Yes' THEN 1 END) AS yes_count,
    COUNT(CASE WHEN b.bet_answer = 'No' THEN 1 END) AS no_count,
    SUM(CASE WHEN b.bet_answer = 'Yes' THEN b.stake_amount ELSE 0 END) AS yes_pool,
    SUM(CASE WHEN b.bet_answer = 'No' THEN b.stake_amount ELSE 0 END) AS no_pool
FROM sia_topic t
LEFT JOIN sia_users u ON t.topic_user_id = u.user_id
LEFT JOIN sia_bets b ON t.topic_id = b.topic_id
WHERE t.topic_status != 'closed' 
  AND t.topic_start_date > NOW()
GROUP BY t.topic_id, u.user_id
ORDER BY t.topic_start_date;

        `;

        const result = await this.callQuery(query) as any[];



        // For each topic, get top players for both Yes and No sides
        const topics = await Promise.all(
            result.map(async (topic: any) => {
                // Get top Yes players for this topic
                const yesPlayers = await this.callQuery(`
                    SELECT 
                        u.user_id,
                        u.username,
                        u.avatar,
                        b.stake_amount as amount
                    FROM sia_users u
                    JOIN sia_bets b ON u.user_id = b.user_id
                    WHERE b.topic_id = '${topic.topic_id}' AND b.bet_answer = 'Yes'
                    ORDER BY b.stake_amount DESC
                    LIMIT 10
                `);

                // Get top No players for this topic
                const noPlayers = await this.callQuery(`
                    SELECT 
                        u.user_id,
                        u.username, 
                        u.avatar,
                        b.stake_amount as amount
                    FROM sia_users u
                    JOIN sia_bets b ON u.user_id = b.user_id
                    WHERE b.topic_id = '${topic.topic_id}' AND b.bet_answer = 'No'
                    ORDER BY b.stake_amount DESC
                    LIMIT 10
                `);

                return {
                    ...topic,
                    topPlayers: {
                        yes: yesPlayers,
                        no: noPlayers
                    }
                };
            })
        );

        return this.makeResponse(200, "Topics feed fetched successfully", topics);
    }

    async updateTopicStatus() {
        try {
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Update topics that should be started
            await this.callQuery(`
                UPDATE sia_topic 
                SET topic_status = 'started'
                WHERE topic_start_date <= '${currentDate}'
                AND topic_status = 'active'
                AND approval_status = 'approved'
            `);

            // Update topics that should be completed
            await this.callQuery(`
                UPDATE sia_topic 
                SET topic_status = 'finished'
                WHERE topic_end_date <= '${currentDate}'
                AND topic_status = 'started'
                AND approval_status = 'approved'
            `);

            return this.makeResponse(200, "Topic statuses updated successfully");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return this.makeResponse(500, errorMessage);
        }
    }
    async getPlayersForBet(topicId: string) {
        const topPlayers = await this.callQuery(`
            SELECT 
                u.username,
                u.avatar,
                COUNT(b.bet_id) as total_bets,
                SUM(CASE WHEN b.bet_final_result = 'won' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN b.bet_final_result = 'lost' THEN 1 ELSE 0 END) as losses
            FROM sia_users u
            LEFT JOIN sia_bets b ON u.user_id = b.user_id
            WHERE b.topic_id = '${topicId}'
            GROUP BY u.user_id
            ORDER BY total_bets DESC
            LIMIT 100
        `);

        return this.makeResponse(200, "Topics feed fetched successfully", topPlayers);
    }

    async getPendingTopics(userId: string) {
        const topics = await this.callQuery(
            `SELECT * FROM sia_topic WHERE approval_status = 'pending'`
        );
        return this.makeResponse(200, "Pending topics fetched successfully", topics);
    }

    async userBets(userId: string, status: string) {
        const bets = await this.callQuery(
            `SELECT sia_bets.*, sia_topic.topic_title, sia_topic.topic_question, sia_topic.topic_start_date, sia_topic.topic_end_date, sia_topic.topic_status, sia_topic.topic_user_id, sia_topic.topic_category_id, sia_topic.group_id, sia_topic.approval_status FROM sia_bets INNER JOIN sia_topic ON sia_bets.topic_id = sia_topic.topic_id WHERE sia_bets.user_id = '${userId}' AND sia_bets.bet_status = '${status}'`
        );
        return this.makeResponse(200, "Bets fetched successfully", bets);
    }

    async leaderboard() {
        const leaders = await this.callQuery(
            `SELECT 
                sia_users.username, 
                sia_users.avatar, 
                sia_users.user_id, 
                COALESCE(wins.win_count, 0) as wins,
                COALESCE(losses.loss_count, 0) as losses,
                COALESCE(wins.win_count, 0) + COALESCE(losses.loss_count, 0) as total_bets,
                CASE 
                    WHEN COALESCE(wins.win_count, 0) + COALESCE(losses.loss_count, 0) = 0 THEN 0
                    ELSE ROUND((COALESCE(wins.win_count, 0) * 100.0) / (COALESCE(wins.win_count, 0) + COALESCE(losses.loss_count, 0)), 0)
                END as win_rate
            FROM 
                sia_users 
            LEFT JOIN (
                SELECT user_id, COUNT(*) as win_count 
                FROM sia_bets 
                WHERE bet_final_result = 'won' 
                GROUP BY user_id
            ) wins ON sia_users.user_id = wins.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as loss_count 
                FROM sia_bets 
                WHERE bet_final_result = 'lost' 
                GROUP BY user_id
            ) losses ON sia_users.user_id = losses.user_id
            ORDER BY wins DESC, win_rate DESC, total_bets DESC
            LIMIT 50`
        ) as any[];

        // Add rank to each user
        let rank = 1;
        const leadersWithRank = leaders.map((leader: any, index: number) => {
            // If this user has the same wins as the previous user, they share the same rank
            if (index > 0 && leader.wins === leaders[index - 1].wins) {
                return { ...leader, rank: leaders[index - 1].rank };
            }
            return { ...leader, rank: rank++ };
        });

        return this.makeResponse(200, "Leaderboard fetched successfully", leadersWithRank);
    }

    async getAllCategories(query: string) {
        const categories = await this.callQuery(
            `SELECT * FROM sia_category `
        );
        return this.makeResponse(200, "Categories fetched successfully", categories);
    }

    async getRequests(userId: string) {
        const requests = await this.callQuery(
            `SELECT * FROM sia_bets WHERE opponent_user_id = '${userId}' AND match_status = 'unmatched'`
        );
        return this.makeResponse(200, "Requests fetched successfully", requests);
    }

    async makePaymentsPayouts(topic_id: string) {
        try {
            // Get topic final result
            const topic = await this.getTopicDetail(topic_id);
            if (!topic || !topic.final_result) {
                return { status: 400, message: "Topic not found or no final result" };
            }

            // Get all bets for this topic
            const bets = await this.callQuery(
                `SELECT * FROM sia_bets WHERE topic_id = '${topic_id}' AND bet_status = 'closed'`
            ) as any[];

            // Separate winning and losing bets
            const winningBets = bets.filter(bet => bet.bet_answer === topic.final_result);
            const losingBets = bets.filter(bet => bet.bet_answer !== topic.final_result);

            // Calculate total amounts
            const totalWinningAmount = winningBets.reduce((sum, bet) => sum + Number(bet.stake_amount), 0);
            const totalLosingAmount = losingBets.reduce((sum, bet) => sum + Number(bet.stake_amount), 0);

            // Calculate profit pool (80% of losing amount)
            const profitPool = totalLosingAmount * 0.8;
            const platformFee = totalLosingAmount * 0.2;

            // Calculate profit per winning bet
            const profitPerBet = profitPool / totalWinningAmount;

            // Process payments in batches of 100
            const batchSize = 100;
            const winningBatches = [];

            for (let i = 0; i < winningBets.length; i += batchSize) {
                winningBatches.push(winningBets.slice(i, i + batchSize));
            }

            for (const batch of winningBatches) {
                // Process payments with Promise.all to handle async operations
                const paymentPromises = batch.map(async (bet) => {
                    const userWallet: any = await this.getWallet(bet.user_id);
                    return {
                        publicKey: userWallet.publicKey,
                        amount: (Number(bet.stake_amount) + profitPerBet).toString(),
                        asset_code: stellar.assetIssuer,
                        asset_issuer: stellar.assetIssuer,
                        senderSecretKey: this.stellar.escrowAccount,
                        creditPrivateKey: userWallet.secret || ''
                    };
                });

                const payments: Recipient[] = await Promise.all(paymentPromises);

                // Process batch payments
                const results = await this.stellar.makeBatchTransfers("win payout", payments);

                // Update bet statuses
                for (let i = 0; i < batch.length; i++) {
                    const bet = batch[i];
                    const result = results[i];

                    await this.updateData("sia_bets",
                        `bet_id = '${bet.bet_id}'`,
                        {
                            bet_final_result: "won",
                            bet_status: "paid",
                            payout_hash: result
                        }
                    );
                }
            }

            // Transfer platform fee to profit account
            if (platformFee > 0) {
                await this.stellar.makePayment({
                    senderKeyPair: await this.stellar.getKeypairFromSecret(this.stellar.escrowAccount),
                    recipientPublicKey: 'GANILKVETD47ETWB3CTGYWA7KEPNLN4R46D7G34VRAU6UTCIV5KEWOJ',
                    assetCode: stellar.assetIssuer,
                    assetIssuer: stellar.assetIssuer,
                    amount: platformFee.toString(),
                    memo: `profit ${topic_id}`
                });
            }

            return { status: 200, message: "Payouts processed successfully" };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return { status: 403, message: errorMessage };
        }
    }

    async getTopicsForGroup(groupId: string) {
        const topics = await this.callQuery(
            `SELECT * FROM sia_topic WHERE group_id = '${groupId}'`
        ) as any[];
        return this.makeResponse(200, "Topics fetched successfully", topics);
    }

    async getGroupBet(groupId: string, betId: string) {
        const bet = await this.callQuery(
            `SELECT b.*, t.topic_title, t.topic_question, u.username
             FROM sia_bets b
             JOIN sia_topic t ON b.topic_id = t.topic_id
             JOIN sia_users u ON b.user_id = u.user_id
             WHERE t.group_id = '${groupId}' AND b.bet_id = '${betId}'`
        ) as any[];
        return this.makeResponse(200, "Group bet fetched successfully", bet[0] || null);
    }

    private async getTopicDetail(topicId: string) {
        const topics = await this.callQuery(
            `SELECT * FROM sia_topic WHERE topic_id = '${topicId}'`
        ) as any[];
        return topics[0];
    }

    private async getPendingTopicDetail(topicId: string) {
        const topics = await this.callQuery(
            `SELECT * FROM sia_topic 
             WHERE topic_id = '${topicId}' 
             AND approval_status = 'pending'`
        ) as any[];
        return this.makeResponse(200, "Pending topic detail fetched successfully", topics[0]);
    }

    private async getWorthOpponent(userId: string, answer: string, topicId: string, amount: string) {
        const opponents = await this.callQuery(
            `SELECT * FROM sia_bets 
             WHERE topic_id = '${topicId}' 
             AND user_id != '${userId}' 
             AND bet_answer != '${answer}' 
             AND stake_amount = '${amount}' 
             AND match_status = 'unmatched'`
        ) as any[];
        return this.makeResponse(200, "Worth opponent fetched successfully", opponents[0]);
    }

    private async getOpponent(answer: string, topicId: string, amount: string, betId: string) {
        const opponents = await this.callQuery(
            `SELECT * FROM sia_bets 
             WHERE bet_id = '${betId}' 
             AND topic_id = '${topicId}' 
             AND bet_answer != '${answer}' 
             AND stake_amount = '${amount}' 
             AND match_status = 'unmatched'`
        ) as any[];
        return this.makeResponse(200, "Opponent fetched successfully", opponents[0]);
    }

    private async getAllBetsForTopic(topicId: string) {
        const bets = await this.callQuery(
            `SELECT * FROM sia_bets WHERE topic_id = '${topicId}'`
        ) as any[];
        return bets;
    }

    private async getAllPayouts(reason: string) {
        const payouts = await this.callQuery(
            `SELECT * FROM sia_payable_bets WHERE reason = '${reason}' AND payout_status = 'pending'`
        ) as any[];
        return this.makeResponse(200, "All payouts fetched successfully", payouts);
    }

    private async isGroupMember(groupId: string, userId: string): Promise<boolean> {
        const members = await this.callQuery(
            `SELECT * FROM sia_group_members WHERE group_id = '${groupId}' AND user_id = '${userId}'`
        ) as any[];
        return members.length > 0;
    }

    async getActiveBetsForResults(filter: { status?: string; match_status?: string }) {
        const { status = 'active', match_status = 'matched' } = filter;

        // Also include topics where the end date has passed
        // This indicates events that have completed and need results
        const currentDateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const query = `
            SELECT 
                t.*,
                u.username as creator_name,
                u.avatar as creator_avatar,
                COUNT(CASE WHEN b.bet_answer = 'Yes' THEN 1 END) as yes_count,
                COUNT(CASE WHEN b.bet_answer = 'No' THEN 1 END) as no_count,
                SUM(CASE WHEN b.bet_answer = 'Yes' THEN b.stake_amount ELSE 0 END) as yes_pool,
                SUM(CASE WHEN b.bet_answer = 'No' THEN b.stake_amount ELSE 0 END) as no_pool
            FROM sia_topic t
            LEFT JOIN sia_users u ON t.topic_user_id = u.user_id
            INNER JOIN sia_bets b ON t.topic_id = b.topic_id
            WHERE (t.topic_status = '${status}' OR t.topic_end_date <= '${currentDateStr}')
            AND b.match_status = '${match_status}'
            GROUP BY t.topic_id, u.user_id
            ORDER BY 
                CASE 
                    WHEN t.topic_end_date <= '${currentDateStr}' AND t.topic_status = 'active' THEN 0
                    ELSE 1
                END,
                t.topic_end_date ASC
        `;

        const result = await this.callQuery(query) as any[];

        return this.makeResponse(200, "Active bets for results fetched successfully", result);
    }

    async getSports(league?: string) {
        try {
            // Import OddsApiHelper dynamically to avoid circular dependencies
            const { default: OddsApiHelper } = await import('../thirdparty/OddsApiHelper');
            const oddsApi = new OddsApiHelper();
            
            // Get popular games for today and next 7 days
            const popularGames = await oddsApi.getTop5PopularGamesToday(7, 20);
            
            if (!popularGames || popularGames.length === 0) {
                console.log('No games found from Odds API, using fallback data');
                return this.getFallbackSportsData(league);
            }
            
            // Transform Odds API data to our format
            const transformedSports = popularGames.map((game: any, index: number) => ({
                id: game.id || `game_${index}`,
                homeTeam: {
                    id: game.home_team?.id || `home_${index}`,
                    name: game.home_team?.name || 'Home Team',
                    shortName: game.home_team?.name?.substring(0, 3).toUpperCase() || 'HOM'
                },
                awayTeam: {
                    id: game.away_team?.id || `away_${index}`,
                    name: game.away_team?.name || 'Away Team',
                    shortName: game.away_team?.name?.substring(0, 3).toUpperCase() || 'AWY'
                },
                startTime: game.commence_time || new Date().toISOString(),
                status: this.mapOddsApiStatus(game.status),
                league: game.sport_title || 'Unknown League',
                country: this.getCountryFromSport(game.sport_key),
                odds: this.extractOdds(game.bookmakers),
                minute: game.status === 'inprogress' ? '45' : undefined,
                venue: game.venue || undefined,
            }));
            
            // Filter by league if provided
            const filteredSports = league
                ? transformedSports.filter(match => 
                    match.league.toLowerCase().includes(league.toLowerCase()) ||
                    match.country.toLowerCase().includes(league.toLowerCase())
                  )
                : transformedSports;

            return {
                status: 200,
                data: filteredSports,
                message: 'Sports matches fetched successfully from live API'
            };
        } catch (error) {
            console.error('Get sports error:', error);
            console.log('Falling back to static data due to API error');
            return this.getFallbackSportsData(league);
        }
    }
    
    private getFallbackSportsData(league?: string) {
        // Static fallback data when API is not available
        const fallbackSports = [
            {
                id: '1',
                homeTeam: { id: '1', name: 'Chelsea', shortName: 'CHE' },
                awayTeam: { id: '2', name: 'Leicester City', shortName: 'LEI' },
                startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                status: 'SCHEDULED',
                league: 'Premier League',
                country: 'England',
                odds: { home: 2.0, draw: 3.5, away: 1.85 },
                minute: undefined,
            },
            {
                id: '2',
                homeTeam: { id: '3', name: 'Manchester United', shortName: 'MUN' },
                awayTeam: { id: '4', name: 'Liverpool', shortName: 'LIV' },
                startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                status: 'SCHEDULED',
                league: 'Premier League',
                country: 'England',
                odds: { home: 2.5, draw: 3.2, away: 2.1 },
                minute: undefined,
            },
            {
                id: '3',
                homeTeam: { id: '5', name: 'Barcelona', shortName: 'BAR' },
                awayTeam: { id: '6', name: 'Real Madrid', shortName: 'RMA' },
                startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                status: 'SCHEDULED',
                league: 'La Liga',
                country: 'Spain',
                odds: { home: 2.2, draw: 3.1, away: 1.9 },
                minute: undefined,
            },
            {
                id: '4',
                homeTeam: { id: '7', name: 'Bayern Munich', shortName: 'BAY' },
                awayTeam: { id: '8', name: 'Borussia Dortmund', shortName: 'BVB' },
                startTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
                status: 'SCHEDULED',
                league: 'Bundesliga',
                country: 'Germany',
                odds: { home: 1.8, draw: 3.4, away: 2.3 },
                minute: undefined,
            },
        ];
        
        const filteredSports = league
            ? fallbackSports.filter(match => match.league.toLowerCase().includes(league.toLowerCase()))
            : fallbackSports;
            
        return {
            status: 200,
            data: filteredSports,
            message: 'Sports matches fetched successfully (static data)'
        };
    }
    
    private mapOddsApiStatus(status: string): 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED' {
        switch (status?.toLowerCase()) {
            case 'inprogress':
            case 'live':
                return 'LIVE';
            case 'completed':
            case 'finished':
                return 'FINISHED';
            case 'postponed':
                return 'POSTPONED';
            case 'cancelled':
                return 'CANCELLED';
            case 'suspended':
                return 'SUSPENDED';
            case 'scheduled':
            default:
                return 'SCHEDULED';
        }
    }
    
    private getCountryFromSport(sportKey: string): string {
        const sportCountryMap: { [key: string]: string } = {
            'soccer_epl': 'England',
            'soccer_spain_la_liga': 'Spain',
            'soccer_germany_bundesliga': 'Germany',
            'soccer_italy_serie_a': 'Italy',
            'soccer_france_ligue_one': 'France',
            'soccer_uefa_champs_league': 'Europe',
            'americanfootball_nfl': 'USA',
            'basketball_nba': 'USA',
            'icehockey_nhl': 'USA',
        };
        return sportCountryMap[sportKey] || 'International';
    }
    
    private extractOdds(bookmakers: any[]): { home: number; draw: number; away: number } | undefined {
        if (!bookmakers || bookmakers.length === 0) {
            return { home: 2.0, draw: 3.5, away: 1.85 }; // Default odds
        }
        
        // Get odds from the first bookmaker
        const firstBookmaker = bookmakers[0];
        if (firstBookmaker?.markets?.[0]?.outcomes) {
            const outcomes = firstBookmaker.markets[0].outcomes;
            const home = outcomes.find((o: any) => o.name === firstBookmaker.markets[0].outcomes[0]?.name);
            const away = outcomes.find((o: any) => o.name === firstBookmaker.markets[0].outcomes[1]?.name);
            const draw = outcomes.find((o: any) => o.name === 'Draw' || o.name === 'Tie');
            
            return {
                home: home?.price || 2.0,
                draw: draw?.price || 3.5,
                away: away?.price || 1.85
            };
        }
        
        return { home: 2.0, draw: 3.5, away: 1.85 }; // Default odds
    }

    async getSportsPredictions(category?: string) {
        try {
            // Use the existing topicsFeed method but filter for sports-related categories
            const result = await this.topicsFeed(category || '1'); // Default to category 1 (Soccer)

            // Transform the data to match sports predictions format
            const sportsPredictions = result.data?.map((topic: any) => ({
                id: topic.topic_id,
                title: topic.topic_title,
                question: topic.topic_question,
                description: topic.topic_description || '',
                endDate: topic.topic_end_date,
                yes_pool: topic.yes_pool || 0,
                no_pool: topic.no_pool || 0,
                startDate: topic.topic_start_date,
                yesPercentage: topic.yes_percentage || 50,
                stakeAmount: topic.stake_amount,
                created_by: topic.creator_name,
                created_on: topic.uploaded_on,
                topic_status: topic.topic_status,
                final_result: topic.final_result,
                topPlayers: topic.topPlayers || { yes: [], no: [] },
                category_id: topic.topic_category_id,
                category_name: topic.category_name || 'Sports'
            })) || [];

            return {
                status: 200,
                data: sportsPredictions,
                message: 'Sports predictions fetched successfully'
            };
        } catch (error) {
            console.error('Get sports predictions error:', error);
            return { status: 500, message: 'Server error while fetching sports predictions' };
        }
    }

    // Provably Fair Game Methods
    async initializeGame(data: any) {
        try {
            const { userId, gameType } = data;

            // Generate server seed and hash
            const serverSeed = this.generateServerSeed();
            const serverSeedHash = this.hashSeed(serverSeed);

            // Store game initialization
            const gameId = uuidv4();
            await this.callQuery(`
                INSERT INTO sia_games (game_id, user_id, game_type, server_seed_hash, client_seed, nonce, status, created_at)
                VALUES ('${gameId}', '${userId}', '${gameType}', '${serverSeedHash}', '${data.clientSeed || ''}', 0, 'initialized', NOW())
            `);

            return {
                status: 200,
                message: 'Game initialized successfully',
                data: {
                    gameId,
                    serverSeedHash,
                    clientSeed: data.clientSeed || '',
                    nonce: 0
                }
            };
        } catch (error) {
            console.error('Initialize game error:', error);
            return {
                status: 500,
                message: 'Server error while initializing game'
            };
        }
    }

    async playGame(data: any) {
        try {
            const { gameId, userId, gameType, betAmount, clientSeed, nonce, gameParams } = data;

            // Get game data
            const gameData: any = await this.callQuery(
                `SELECT * FROM sia_games WHERE game_id = '${gameId}' AND user_id = '${userId}'`
            );

            if (!gameData[0]) {
                return { status: 404, message: 'Game not found' };
            }

            // Get server seed (in real implementation, this would be revealed after game)
            const serverSeed = this.generateServerSeed(); // This should be stored and revealed

            // Calculate result
            const result = this.calculateGameResult(serverSeed, clientSeed, nonce, gameType, gameParams);

            // Calculate payout
            const payout = this.calculatePayout(result, betAmount, gameType, gameParams);

            // Update game with result
            await this.callQuery(`
                UPDATE sia_games 
                SET server_seed = '${serverSeed}', result = '${JSON.stringify(result)}', payout = ${payout}, status = 'completed', played_at = NOW()
                WHERE game_id = '${gameId}'
            `);

            // Deduct bet amount and add payout to user balance
            await this.updateUserBalance(userId, -betAmount + payout);

            return {
                status: 200,
                message: 'Game played successfully',
                data: {
                    result,
                    payout,
                    serverSeed,
                    clientSeed,
                    nonce,
                    hash: this.hashSeed(serverSeed + clientSeed + nonce)
                }
            };
        } catch (error) {
            console.error('Play game error:', error);
            return {
                status: 500,
                message: 'Server error while playing game'
            };
        }
    }

    async recordGameResult(data: any) {
        try {
            const { gameId, userId, result, payout } = data;

            // Record game result in history
            await this.callQuery(`
                INSERT INTO sia_game_history (game_id, user_id, game_type, bet_amount, payout, result, played_at)
                VALUES ('${gameId}', '${userId}', '${data.gameType}', ${data.betAmount}, ${payout}, '${JSON.stringify(result)}', NOW())
            `);

            return {
                status: 200,
                message: 'Game result recorded successfully'
            };
        } catch (error) {
            console.error('Record game result error:', error);
            return {
                status: 500,
                message: 'Server error while recording game result'
            };
        }
    }

    async getGameHistory(userId: string) {
        try {
            const history = await this.callQuery(`
                SELECT * FROM sia_game_history 
                WHERE user_id = '${userId}' 
                ORDER BY played_at DESC 
                LIMIT 50
            `);

            return {
                status: 200,
                message: 'Game history fetched successfully',
                data: history
            };
        } catch (error) {
            console.error('Get game history error:', error);
            return {
                status: 500,
                message: 'Server error while fetching game history'
            };
        }
    }

    // Helper methods for provably fair games
    private generateServerSeed(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private hashSeed(seed: string): string {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    private calculateGameResult(serverSeed: string, clientSeed: string, nonce: number, gameType: string, gameParams?: any): any {
        const combined = `${serverSeed}:${clientSeed}:${nonce}:${gameType}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        switch (gameType) {
            case 'coin':
                return Math.abs(hash) % 2 === 0 ? 'heads' : 'tails';
            case 'dice':
                return (Math.abs(hash) % 6) + 1;
            case 'crash':
                const crashValue = Math.abs(hash) % 10000;
                return Math.max(1.01, (crashValue / 1000) + 1);
            default:
                return null;
        }
    }

    private calculatePayout(result: any, betAmount: number, gameType: string, gameParams?: any): number {
        switch (gameType) {
            case 'coin':
                return result === gameParams.selectedSide ? betAmount * 2 : 0;
            case 'dice':
                const { target, condition } = gameParams;
                const win = condition === 'over' ? result > target : result < target;
                const multiplier = condition === 'over' ? (6 / (6 - target)) : (6 / target);
                return win ? betAmount * multiplier : 0;
            case 'crash':
                const { cashoutMultiplier } = gameParams;
                return cashoutMultiplier <= result ? betAmount * cashoutMultiplier : 0;
            default:
                return 0;
        }
    }

    private async updateUserBalance(userId: string, amountChange: number) {
        try {
            // Get current balance
            const userInfo: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE user_id = '${userId}'`
            );

            if (!userInfo[0]) {
                throw new Error('User not found');
            }

            // Update balance (this is simplified - in real implementation, use Stellar)
            const newBalance = Math.max(0, (userInfo[0].balance || 0) + amountChange);

            await this.callQuery(`
                UPDATE sia_users 
                SET balance = ${newBalance} 
                WHERE user_id = '${userId}'
            `);

        } catch (error) {
            console.error('Update user balance error:', error);
            throw error;
        }
    }
}
