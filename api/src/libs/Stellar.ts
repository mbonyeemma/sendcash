import * as StellarSdk from 'stellar-sdk';
import {
    Keypair,
    Networks,
    Asset,
    TransactionBuilder,
    Memo,
    Operation,
    Claimant,
    Server
} from 'stellar-sdk';

import dotenv from 'dotenv';
import config from '../config';
import BaseModel from './database';

dotenv.config();
export interface Balance {
    id: string;
    icon: string;
    name: string;
    symbol: string;
    issuer: string;
    balance: string;
}




export interface Recipient {
    publicKey: string;
    amount: string;
    asset_code: string;
    asset_issuer: string;
    senderSecretKey: string;
    creditPrivateKey: string
}
interface StellarConfig {
    startBalance: string;
    startBonusAmount: string;
    networkPassphrase: string;
    horizon: string;
    assetIssuer: string;
    assetIssuerPv: string;
    airdropAccount: string;
    escrowAccount: string;
    escrowAccountPvKey: string;
    defaultFee: number;
}

interface TransactionResponse {
    hash: string;
    [key: string]: any;
}

const SponserKey = process.env.SPONSOR_KEY || '';
const network = process.env.NETWORK =='testnet'? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;
export class Stellar extends BaseModel {
    private server: Server;
    public escrowAccount: string = process.env.ESCROW_ACCOUNT || '';
    public assetIssuerPv: string = process.env.FIAT_ISSUER_PV || '';
    public assetIssuer: string = process.env.FIAT_ISSUER || '';

    private airdropKeypair: Keypair;
    private horizonUrl: string = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org/';
    private issuerPv: string;
    constructor() {
        super();
        this.server = new Server(this.horizonUrl);
        const airdropSecret = process.env.AIRDROP_SECRET;
        if (!airdropSecret) {
            throw new Error('AIRDROP_SECRET environment variable is not set');
        }
        this.airdropKeypair = Keypair.fromSecret(airdropSecret);
    }

    async claimClaimableBalance(claimantSecret: string, sponserId: string): Promise<any[]> {
        const claimantKeypair = Keypair.fromSecret(claimantSecret);
        const senderAccount = await this.server.loadAccount(claimantKeypair.publicKey());
        const betAsset = new Asset(this.assetIssuer, this.assetIssuer);

        const balance = await this.server.claimableBalances()
            .claimant(claimantKeypair.publicKey())
            .call();

        console.log(balance);
        return balance.records;
    }

    async createClaimableBalance(params: {
        senderKeyPair: Keypair;
        recipientPublicKey: string;
        amount: string;
        memo: string;
    }): Promise<string> {
        try {
            const { senderKeyPair, recipientPublicKey, amount, memo } = params;
            const sourceAccount = await this.server.loadAccount(senderKeyPair.publicKey());
            const betAsset = new Asset(this.assetIssuer, this.assetIssuer);

            const claimants = [
                new Claimant(recipientPublicKey)  // Unconditional claim
            ];

            const transaction = new TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: network
            })
                .addMemo(Memo.text(memo))
                .addOperation(Operation.createClaimableBalance({
                    asset: betAsset,
                    amount,
                    claimants
                }))
                .setTimeout(30)
                .build();

            transaction.sign(senderKeyPair);
            const result = await this.server.submitTransaction(transaction);
            return result.hash;
        } catch (error) {
            console.error('Create claimable balance failed:', error);
            return 'failed';
        }
    }

    async betMatchClaimableBalance(
        senderKeypair: Keypair,
        opponentKeypair: Keypair,
        amount: string,
        memo: string
    ): Promise<string> {
        const senderPublicKey = senderKeypair.publicKey();
        const opponentPublicKey = opponentKeypair.publicKey();

        const senderAccount = await this.server.loadAccount(senderPublicKey);
        const betAsset = new Asset(this.assetIssuer, this.assetIssuer);

        const now = new Date();
        const soon = Math.floor(now.getTime() / 1000) + 60;

        // In version 7, we'll use unconditional claims for simplicity
        const senderClaimantsList = [
            new Claimant(opponentPublicKey),
            new Claimant(senderPublicKey)
        ];

        const opponentClaimantsList = [
            new Claimant(senderPublicKey),
            new Claimant(opponentPublicKey)
        ];

        const transaction = new TransactionBuilder(
            senderAccount,
            {
                networkPassphrase: network,
                fee: '100'
            }
        )
            .addMemo(Memo.text(memo))
            .addOperation(Operation.createClaimableBalance({
                asset: betAsset,
                amount: amount,
                claimants: senderClaimantsList
            }))
            .addOperation(Operation.createClaimableBalance({
                asset: betAsset,
                amount: amount,
                claimants: opponentClaimantsList,
                source: opponentPublicKey
            }))
            .setTimeout(30)
            .build();

        transaction.sign(senderKeypair);
        transaction.sign(opponentKeypair);
        const result = await this.server.submitTransaction(transaction);
        return result.hash;
    }
    async getBalance(publicKey: string, assetCode: string, assetIssuer: string) {
        try {
            const account = await this.server.loadAccount(publicKey);
            const betAsset = new Asset(assetCode, assetIssuer);

            // Find the balance for our specific asset
            const balance = account.balances.find(
                (b: any) => b.asset_code === betAsset.code && b.asset_issuer === betAsset.issuer
            );

            return balance ? balance.balance : '0'

        } catch (error) {

            console.error('Error getting balance:', error);
            return '0'
        }
    }

    async getBalances(publicKey: string) {

        const defaultTokens = ["XLM", "SBX", "UGX", "USDT","USDC"];

        const balancesMap: Record<string, Balance> = {};

        try {
            const account: any = await this.server.loadAccount(publicKey);
            for (const balance of account.balances) {
                const asset_type = balance?.asset_type || '';
                const issuer = asset_type === 'native' ? '' : balance?.asset_issuer || '';
                const code = (asset_type === 'native' ? 'XLM' : balance?.asset_code || '').toUpperCase();

                balancesMap[code] = {
                    id: balance.id || code,
                    icon: "💰",
                    name: code,
                    symbol: code,
                    issuer: issuer,
                    balance: balance.balance
                };
            }
        } catch (error) {
            // swallow error and fall back to default balances below
        }

        defaultTokens.forEach(token => {
            if (!balancesMap[token]) {
                balancesMap[token] = {
                    id: token,
                    icon: "💰",
                    name: token,
                    symbol: token,
                    issuer: '',
                    balance: '0'
                };
            }
        });

        return Object.values(balancesMap);
    }

    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getChannelAccount() {
        await this.callQuery("UPDATE `channel_accounts` SET `status` = 'free' WHERE `updated_at` < (NOW() - INTERVAL 1 MINUTE)");

        const maxWaitTime = 10000; // Maximum wait time of 10 seconds
        const checkInterval = 1000; // Check every 1 second
        const startTime = Date.now();

        let channelAccount: any = [];
        while (Date.now() - startTime < maxWaitTime) {
            channelAccount = await this.callQuery("SELECT * FROM channel_accounts WHERE status='free' LIMIT 1");
            if (channelAccount.length > 0) {
                const pvKey = channelAccount[0]['private_key'];
                this.updateChannelAccount(pvKey, "free");
                return pvKey;
            }
            await this.delay(checkInterval);
        }
        return "";
    }



    async updateChannelAccount(private_key: any, status: string) {
        try {
            const PostData = {
                status: status
            };
            return await this.updateData('channel_accounts', `private_key='${private_key}'`, PostData);
        } catch (e) {
            return "";
        }
    }

    addSignerIfNotExists(signers: Array<any>, keyPair: Keypair) {
        if (!signers.some(signer => signer.publicKey() === keyPair.publicKey())) {
            console.log("keyPair===>", keyPair.publicKey(), keyPair.secret())
             signers.push(keyPair);
        }
        return signers;
    }


    async makeBatchTransfers(trans_id: string, recipients: Recipient[], memo: string = "transfer") {
        const channelAccount = await this.getChannelAccount();
        try {
            this.updateTransactionLog(trans_id, "PENDING", recipients)

            console.log("RECEIVED==>", recipients)
            console.log("SPONSOR_KEY from env:", process.env.SPONSOR_KEY)
            console.log("SponserKey variable:", SponserKey)
            const SponsoringAccount = StellarSdk.Keypair.fromSecret(SponserKey);
            console.log("SponsoringAccount public key:", SponsoringAccount.publicKey())
            const sourceAccountKeyPair = StellarSdk.Keypair.fromSecret(channelAccount);
            let signers: Array<any> = [];


            const fees = 1000000;

            const [
                {
                    max_fee: { mode: fee },
                },
                distributionAccount,
            ] = await Promise.all([
                this.server.feeStats(),
                this.server.loadAccount(sourceAccountKeyPair.publicKey()),
            ]);
            
            // Check if sponsoring account exists
            let sponsoringAccount;
            try {
                sponsoringAccount = await this.server.loadAccount(SponsoringAccount.publicKey());
                console.log("Sponsoring account exists with balance:", sponsoringAccount.balances.find((b: any) => b.asset_type === 'native')?.balance || '0');
            } catch (error) {
                console.log("ERROR: Sponsoring account does not exist:", SponsoringAccount.publicKey());
                throw new Error(`Sponsoring account ${SponsoringAccount.publicKey()} does not exist on the network`);
            }
            
            console.log("Distribution account balance:", distributionAccount.balances.find((b: any) => b.asset_type === 'native')?.balance || '0');
            console.log("Distribution account sequence:", distributionAccount.sequenceNumber());
            console.log("Sponsoring account sequence:", sponsoringAccount.sequenceNumber());

            const transaction_builder = new StellarSdk.TransactionBuilder(distributionAccount, {
                fee: String(fees),
                networkPassphrase: network,
            });
            // this.saveLog(memo, "", "", "");
            let p = 0;
            console.log("STELLAR===>1")

            for (let recipient of recipients) {
                console.log(`OPERATION========>${p}`, recipient)
                let receiverPublicKey = recipient.publicKey;
                p++;



                const asset_code = recipient.asset_code;
                const asset_issuer = recipient.asset_issuer;
                const creditPrivateKey = recipient.creditPrivateKey;
                const senderSecretKey = recipient.senderSecretKey;



                const assetType = 'alpha';
                let amount = Number(recipient.amount).toFixed(7);
                amount = amount.toString();


                const senderKeyPair = StellarSdk.Keypair.fromSecret(senderSecretKey);


                signers = this.addSignerIfNotExists(signers, senderKeyPair);

                //signers.push(senderKeyPair);

                const asset = new StellarSdk.Asset(asset_code, asset_issuer);

                let exists = true;
                let hasTrustLine = true;

                try {
                    // await server.loadAccount(receiverPublicKey);
                    // if (assetType === "alpha") {
                    const assetCode = asset_code;
                    const assetIssuer = asset_issuer;

                    if (assetIssuer == receiverPublicKey) {
                        hasTrustLine = true;
                    } else {

                        const recPbKey = await this.server.loadAccount(receiverPublicKey);
                        hasTrustLine = recPbKey.balances.some((balance: any) => {
                            return balance.asset_code === assetCode && balance.asset_issuer === assetIssuer;
                        });
                    }
                    //}
                } catch (err) {
                    console.log("STELLAR===>3", err)
                    exists = false;
                    hasTrustLine = false;
                }
                console.log("exists===>", exists)
                console.log("hasTrustLine===>", hasTrustLine)

                if (!exists || !hasTrustLine) {
                    const creditPvKeyPair = StellarSdk.Keypair.fromSecret(creditPrivateKey);
                    signers = this.addSignerIfNotExists(signers, creditPvKeyPair);
                    signers = this.addSignerIfNotExists(signers, SponsoringAccount);

                    console.log("Creating account and trustline for:", receiverPublicKey);
                    console.log("Sponsoring account:", SponsoringAccount.publicKey());

                    //1. create account, 2. change trust,3. allow trust, 4.payment

                    transaction_builder.addOperation(StellarSdk.Operation.beginSponsoringFutureReserves({
                        sponsoredId: receiverPublicKey,
                        source: SponsoringAccount.publicKey()
                    }));

                    if (!exists) {
                        console.log("Creating new account:", receiverPublicKey);
                        transaction_builder.addOperation(StellarSdk.Operation.createAccount({
                            startingBalance: "0",
                            destination: receiverPublicKey,
                            source: SponsoringAccount.publicKey()
                        }));
                    }

                    if (!hasTrustLine) {
                        console.log("Adding trustline for:", receiverPublicKey);
                        transaction_builder.addOperation(StellarSdk.Operation.changeTrust({
                            asset: asset,
                            source: receiverPublicKey
                        }));            
                    }

                    transaction_builder.addOperation(StellarSdk.Operation.endSponsoringFutureReserves({
                        source: receiverPublicKey,
                    }));
                }

                transaction_builder.addOperation(StellarSdk.Operation.payment({
                    destination: receiverPublicKey,
                    asset: asset,
                    amount: amount,
                    source: senderKeyPair.publicKey(),
                }));

               
            }
            // Log the transaction builder state and the operations added so far
            console.log("Transaction Builder Source Account:", distributionAccount.accountId());
            
            transaction_builder.setTimeout(20);
            
         
            
            transaction_builder.addMemo(StellarSdk.Memo.text(memo));
            const transaction = transaction_builder.build();

            console.log("=== TRANSACTION DEBUG ===");
            console.log("Source Account:", distributionAccount.accountId());
            console.log("Number of signers:", signers.length);
            console.log("Signers before adding source:", signers.map(s => s.publicKey()));
            
            // Ensure source account is always first signer
            signers = this.addSignerIfNotExists(signers, sourceAccountKeyPair);
            console.log("Final signers:", signers.map(s => s.publicKey()));
            
            // For sponsored operations, sponsoring account must sign FIRST
            const hasSponsoredOperations = signers.some(s => s.publicKey() === SponsoringAccount.publicKey());
            
            if (hasSponsoredOperations) {
                console.log("Sponsored operations detected - sponsoring account signs first");
                // Sort: sponsoring account first, then source account, then others
                signers.sort((a, b) => {
                    if (a.publicKey() === SponsoringAccount.publicKey()) return -1;
                    if (b.publicKey() === SponsoringAccount.publicKey()) return 1;
                    if (a.publicKey() === distributionAccount.accountId()) return -1;
                    if (b.publicKey() === distributionAccount.accountId()) return 1;
                    return 0;
                });
            } else {
                console.log("No sponsored operations - source account signs first");
                // Sort: source account first, then others
                signers.sort((a, b) => {
                    if (a.publicKey() === distributionAccount.accountId()) return -1;
                    if (b.publicKey() === distributionAccount.accountId()) return 1;
                    return 0;
                });
            }
            
            console.log("Final signing order:", signers.map(s => s.publicKey()));
            
            // Sign in the correct order
            for (const signer of signers) {
                console.log("Signing with public key:", signer.publicKey());
                transaction.sign(signer);
            }

            try {
                const transactionResult: any = await this.server.submitTransaction(transaction);
                console.log("StellarResponse===>", transactionResult)
                this.updateChannelAccount(SponserKey, "free");

                if (transactionResult.successful) {
                    this.updateTransactionLog(trans_id, "SUCCESS", { hash: transactionResult.hash });
                    return this.MakeResponse(1, transactionResult.hash)
                } else {
                    this.updateTransactionLog(trans_id, "FAILED", { error: transactionResult.result_xdr });
                    return this.MakeResponse(101, "not processed")
                }
            } catch (e: any) {
                this.updateChannelAccount(SponserKey, "free");

                if (e.code === 'ECONNABORTED' || e.message.includes('timeout')) {
                    this.updateTransactionLog(trans_id, "TIMEOUT", { error: e.message });
                    return this.MakeResponse(504, "Gateway Timeout or Network Issue");
                }

                console.log("Error during transaction submission");

                let errorDetail = e.response?.data?.extras?.result_codes;
                let errorMessage = "stellar transaction error";
                console.log("errorMessage", errorDetail)
                if (errorDetail) {
                    const operationError = errorDetail.operations;
                    const transactionError = errorDetail.transaction;

                    if (operationError === "tx_insufficient_balance") {
                        errorMessage = "Insufficient XLM balance to process transaction";
                    } else if (operationError === "payment_underfunded") {
                        errorMessage = "Insufficient Balance on your account";
                    } else {
                        errorMessage += `: ${transactionError || operationError || 'Unknown'}`;
                    }
                }

                this.updateTransactionLog(trans_id, "FAILED", errorDetail);

                if (errorMessage == "Unknown") {
                    return this.MakeResponse(203, errorMessage);
                } else {
                    console.log(errorMessage);
                    return this.MakeResponse(203, errorMessage);
                }
            }


        } catch (err) {
            this.updateChannelAccount(SponserKey, "free");

            console.log("txError", err)
            this.updateTransactionLog(trans_id, "FAILED", err);
            return this.MakeResponse(203, "transaction not set properly");
        }
    }
    async GetIssuerAccount(asset_code: string, arg1: string) {
        return this.assetIssuerPv;
    }
    updateTransactionLog(trans_id: string, arg1: string, errorDetail: any) {
        return true;
    }

  
    MakeResponse(status: number, errorMessage: string) {
        return {
            status: status,
            message: errorMessage
        } as any;
    }

    async generateKeypair() {
        const keypair = Keypair.random();
        return {
            publicKey: keypair.publicKey(),
            secret: keypair.secret(),
            mnemonic: '' // TODO: Implement mnemonic generation if needed
        };
    }

    getAirdropAccount(): Keypair {
        return this.airdropKeypair;
    }

    async getKeypairFromSecret(secret: string): Promise<Keypair> {
        return Keypair.fromSecret(secret);
    }

    async makePayment(params: {
        senderKeyPair: Keypair;
        recipientPublicKey: string;
        assetCode: string;
        assetIssuer: string;
        amount: string;
        memo: string;
    }): Promise<string> {
        try {
            const { senderKeyPair, recipientPublicKey, assetCode, assetIssuer, amount, memo } = params;
            const asset = new Asset(assetCode, assetIssuer);
            console.log("asset", asset);
            const sourceAccount = await this.server.loadAccount(senderKeyPair.publicKey());

            const transaction = new TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: network
            })
                .addOperation(Operation.payment({
                    destination: recipientPublicKey,
                    asset,
                    amount
                }))
                .addMemo(Memo.text(memo))
                .setTimeout(30)
                .build();

            transaction.sign(senderKeyPair);
            const result = await this.server.submitTransaction(transaction);
            return result.hash;
        } catch (error) {
            console.error('Payment failed:', error);
            return 'failed';
        }
    }
}

export default Stellar; 