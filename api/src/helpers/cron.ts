import * as cron from 'node-cron';
import MudaPayment from './MudaPayment';
import { Wallet } from '../models/Wallet';
import { Bet } from '../models/bets';

class CronService {
 
 
  
    constructor() {
        console.log("Cron Service initiated.");
        console.log("Current server time:", new Date().toLocaleString());
        this.everySixHoursTask();
        this.everyThirtySecondsTask();
        this.everyMinuteTask();
     //   this.everySixHoursQuestionsTask();
    }
    private everySixHoursQuestionsTask = () => {
        // Schedule task to run every 6 hours
        cron.schedule('0 */6 * * *', () => {
            new Bet().getTopQuestionsNextDays();
        });
    };
    private everyThirtySecondsTask = () => {
        // Schedule task to run every 30 seconds
        cron.schedule('*/30 * * * * *', () => {
            console.log('Task running every 30 seconds...');
            // new Wallet().getPendingTransactions();
        });
    };

    private everySixHoursTask = () => {
        // Schedule task to run every 6 hours
        cron.schedule('0 */6 * * *', () => {
            MudaPayment.getJWT();
            console.log('Task running every 6 hours, refreshing JWT token...');
        });
    };

    private everyMinuteTask = () => {
        // Schedule task to run every minute
        cron.schedule('* * * * *', () => {
            new Bet().updateTopicStatus();
            new Wallet().TransactionsAwaitingReversal();
        });
    };
}

export default CronService;
