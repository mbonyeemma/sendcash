import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = Router();

// --- ADMIN AUTHENTICATION (no middleware needed) ---
router.post('/login', adminController.adminLogin);
router.post('/init-default-admin', adminController.initializeDefaultAdmin);

// --- USER CRUD (protected routes) ---
router.get('/users', adminAuthMiddleware, adminController.getUsers);
router.get('/user/:id', adminAuthMiddleware, adminController.getUserById);
router.post('/user', adminAuthMiddleware, adminController.createUser);
router.put('/user/:id', adminAuthMiddleware, adminController.updateUser);
router.delete('/user/:id', adminAuthMiddleware, adminController.deleteUser);
router.get('/user/:id/transactions', adminAuthMiddleware, adminController.getUserTransactions);
router.get('/user/:id/balances', adminAuthMiddleware, adminController.getUserBalances);

// --- SYSTEM USER CRUD (protected routes) ---
router.get('/system-users', adminAuthMiddleware, adminController.getSystemUsers);
router.get('/system-user/:id', adminAuthMiddleware, adminController.getSystemUserById);
router.post('/system-user', adminAuthMiddleware, adminController.createSystemUser);
router.put('/system-user/:id', adminAuthMiddleware, adminController.updateSystemUser);
router.delete('/system-user/:id', adminAuthMiddleware, adminController.deleteSystemUser);

// --- WALLET MANAGEMENT (protected routes) ---
router.get('/wallets', adminAuthMiddleware, adminController.getWallets);
router.get('/wallet/:id', adminAuthMiddleware, adminController.getWalletById);
router.put('/wallet/:id/deactivate', adminAuthMiddleware, adminController.deactivateWallet);

// --- REPORTS (protected routes) ---
router.get('/reports/transactions', adminAuthMiddleware, adminController.getTransactionReport);
router.get('/reports/wallets', adminAuthMiddleware, adminController.getWalletReport);
router.get('/reports/users', adminAuthMiddleware, adminController.getUserReport);
router.get('/reports/system-users', adminAuthMiddleware, adminController.getSystemUserReport);
router.get('/reports/crypto-addresses', adminAuthMiddleware, adminController.getCryptoDepositAddresses);

// --- SETTINGS: PAYMENT TYPE CRUD (protected routes) ---
router.get('/payment-types', adminAuthMiddleware, adminController.getPaymentTypes);
router.post('/payment-type', adminAuthMiddleware, adminController.createPaymentType);
router.put('/payment-type/:id', adminAuthMiddleware, adminController.updatePaymentType);
router.delete('/payment-type/:id', adminAuthMiddleware, adminController.deletePaymentType);

// --- SETTINGS: CHANGE PASSWORD (protected routes) ---
router.put('/change-password', adminAuthMiddleware, adminController.changePassword);
router.put('/user/:id/reset-password', adminAuthMiddleware, adminController.resetUserPassword);
router.put('/system-user/:id/reset-password', adminAuthMiddleware, adminController.resetSystemUserPassword);

// --- EXCHANGE RATES (protected routes) ---
router.get('/exchange-rates', adminAuthMiddleware, adminController.getExchangeRates);

router.post('/sweep', adminAuthMiddleware, adminController.sweepFunds);
router.get('/sweep-settings', adminAuthMiddleware, adminController.getSweepSettings);
 

export default router; 