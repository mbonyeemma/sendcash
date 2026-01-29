import * as cron from 'node-cron';
import { Wallet } from '../models/Wallet';

class CronService {
    constructor() {
        console.log("Cron Service initiated.");
        console.log("Current server time:", new Date().toLocaleString());
        this.everyMinuteTask();
    }

    private everyMinuteTask = () => {
        cron.schedule('* * * * *', () => {
            new Wallet().TransactionsAwaitingReversal();
        });
    };
}

export default CronService;
