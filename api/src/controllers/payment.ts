import express from 'express';
import payment from '../models/payment';
import pi from '../utils/pi';
import { tokenRequired } from '../middleware/auth';
import { ServiceCategory, BillerItem } from '../helpers/interfaces';

const router = express.Router();

import Relworx from '../thirdparty/Relworx';
import { Request, Response } from 'express';
import { Router } from 'express';



router.get('/products', getAvailableProducts);
router.get('/products/price-list', tokenRequired, getPriceList);
router.get('/products/choice-list', getChoiceList);
router.post('/products/validate', tokenRequired, validateProductPurchase);
// router.post('/products/purchase', tokenRequired, purchaseProduct);
router.get('/search/billers/:searchTerm', tokenRequired, searchBillersParams);
router.get('/search/billers', tokenRequired, searchBillersQuery);
router.get('/categories', tokenRequired, getServiceCategories);
router.get('/categories/:categorySlug/billers', tokenRequired, getBillersByCategory);
router.get('/billers', tokenRequired, getAllBillers);
router.get('/billers/:identifier', tokenRequired, getBillerById);
router.post('/products/purchase', tokenRequired, purchaseProduct);
router.post('/exchange-rate', tokenRequired, getRate);


async function getAvailableProducts(req: Request, res: Response) {
  const result = await new Relworx().getAvailableProducts();
  return res.status(result.status).json(result);
};

async function getPriceList(req: Request, res: Response) {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Product code is required',
      data: null,
      status: 400
    });
  }

  const result = await new Relworx().getPriceList(code);
  return res.status(result.status).json(result);
};

async function getChoiceList(req: Request, res: Response) {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Product code is required',
      data: null,
      status: 400
    });
  }

  const result = await new Relworx().getChoiceList(code);
  return res.status(result.status).json(result);
};

async function validateProductPurchase(req: Request, res: Response) {
  const { msisdn, amount, product_code, contact_phone, location_id } = req.body;

  if (amount && !product_code) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields for product validation',
      data: null,
      status: 400
    });
  }

  const result = await new Relworx().validateProduct(
    msisdn,
    amount,
    product_code,
    contact_phone,
    location_id
  );

  return res.status(result.status).json(result);
};

async function purchaseProduct(req: Request, res: Response) {
  const { validation_reference } = req.body;

  if (!validation_reference) {
    return res.status(400).json({
      success: false,
      message: 'Missing validation_reference',
      data: null,
      status: 400
    });
  }

  const result = await new Relworx().purchaseProduct(validation_reference);
  return res.status(result.status).json(result);
};



async function getServiceCategories(req: Request, res: Response) {
  try {
    const result = await new payment().getServiceCategories();

    return res.status(200).json(result);
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get service categories',
      data: [],
      status: 500
    });
  }
};

// Get billers by category
async function getBillersByCategory(req: Request, res: Response) {
  try {
    const { categorySlug } = req.params;

    if (!categorySlug) {
      return res.status(400).json({
        success: false,
        message: 'Category slug is required',
        data: [],
        status: 400
      });
    }

    const result = await new payment().getBillersByCategory(categorySlug);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Get billers by category error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get billers',
      data: [],
      status: 500
    });
  }
};

// =============================================
// Billers Routes
// =============================================

// Get all billers
async function getAllBillers(req: Request, res: Response) {
  try {
    const result = await new payment().getAllBillers();
    return res.status(200).json(result);
  } catch (err) {
    console.error('Get all billers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get billers',
      data: [],
      status: 500
    });
  }
};

// Get specific biller by ID or slug
async function getBillerById(req: Request, res: Response) {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Biller identifier is required',
        data: null,
        status: 400
      });
    }

    const result = await new payment().getBillerById(identifier);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Get biller error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get biller',
      data: null,
      status: 500
    });
  }
};

// Search billers
async function searchBillersParams(req: Request, res: Response) {
  try {
    const { searchTerm } = req.params;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters',
        data: [],
        status: 400
      });
    }

    const result = await new payment().searchBillers(searchTerm);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Search billers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to search billers',
      data: [],
      status: 500
    });
  }
};

// Alternative search via query parameter
async function searchBillersQuery(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" must be at least 2 characters',
        data: [],
        status: 400
      });
    }

    const result = await new payment().searchBillers(q);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Search billers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to search billers',
      data: [],
      status: 500
    });
  }
};

// =============================================
// Exchange Rate Routes
// =============================================

// Get exchange rate
async function getRate(req: Request, res: Response) {
  const { from_currency, to_currency } = req.body;

  if (!from_currency || !to_currency) {
    return res.status(400).json({
      success: false,
      message: 'From currency and to currency are required',
      data: null,
      status: 400
    });
  }

  try {
    const result = await new payment().getRate(from_currency as string, to_currency as string);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Exchange rate error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get exchange rate',
      data: null,
      status: 500
    });
  }
};

// Sync all exchange rates (admin only)
async function syncAllRates(req: Request, res: Response) {
  try {
    const result = await new payment().syncAllRates();
    return res.status(200).json(result);
  } catch (err) {
    console.error('Sync rates error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync exchange rates',
      data: null,
      status: 500
    });
  }
};

// =============================================
// Pi Network Payment Routes (Legacy)
// =============================================

// Approve Pi payment
async function approvePiPayment(req: Request, res: Response) {
  const { paymentId } = req.body;
  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: 'Missing paymentId',
      data: null,
      status: 400
    });
  }

  try {
    // const result = await payment.payments.approve(paymentId);
    // res.json({ status: 'approved', data: result });
    return res.status(501).json({
      success: false,
      message: 'Pi payment approval not implemented',
      data: null,
      status: 501
    });
  } catch (err) {
    console.error('Pi approve error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve payment',
      data: null,
      status: 500
    });
  }
};

// Complete Pi payment
async function completePiPayment(req: Request, res: Response) {
  const { paymentId, txid } = req.body;
  if (!paymentId || !txid) {
    return res.status(400).json({
      success: false,
      message: 'Missing paymentId or txid',
      data: null,
      status: 400
    });
  }

  try {
    // const result = await pi.payments.complete(paymentId, txid);
    // res.json({ status: 'completed', data: result });
    return res.status(501).json({
      success: false,
      message: 'Pi payment completion not implemented',
      data: null,
      status: 501
    });
  } catch (err) {
    console.error('Pi complete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      data: null,
      status: 500
    });
  }
};

export default router; 