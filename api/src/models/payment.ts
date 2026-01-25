import Modal from '../libs/modal';
import fetch from 'node-fetch';
import { Request } from 'express';
import * as db from '../libs/db.helper';

interface FiatRateResponse {
  success: boolean;
  terms: string;
  privacy: string;
  timestamp: number;
  source: string;
  quotes: Record<string, number>;
}

class payment extends Modal {
  private supportedCoins = ['USDT', 'USDC'];
  private supportedCurrencies = ['USD', 'UGX', 'TZS', 'KES', 'EUR', 'GBP', 'CAD', 'PLN'];
  private coinKey = process.env.COINMARKETCAP_API_KEY || '5dfb4f46-f6d4-436a-9448-fbd41cc16ab1';
  private apiKey = process.env.API_LAYER_API_KEY || 'a4bcf3bde6de2d30714612d25beae92a';
  private apiUrl = 'http://apilayer.net/api/live';
  private cacheDuration = 15; // minutes

  /**
   * Get exchange rate for any currency pair
   */
  async getRate(fromCurrency: string, toCurrency: string) {
    const fromCurrencyUpper = fromCurrency.toUpperCase();
    const toCurrencyUpper = toCurrency.toUpperCase();

    // Check if currencies are supported
    const allSupportedCurrencies = [...this.supportedCoins, ...this.supportedCurrencies];
    if (
      !allSupportedCurrencies.includes(fromCurrencyUpper) ||
      !allSupportedCurrencies.includes(toCurrencyUpper)
    ) {
      return this.makeResponse(400, "Unsupported currency pair", { 
        from_currency: fromCurrencyUpper, 
        to_currency: toCurrencyUpper,
        supported_currencies: allSupportedCurrencies
      });
    }

    // Same currency check
    if (fromCurrencyUpper === toCurrencyUpper) {
      return this.makeResponse(200, "Same currency rate", {
        from_currency: fromCurrencyUpper,
        to_currency: toCurrencyUpper,
        rate: 1.0
      });
    }

    try {
      // Check cache first
      const cachedRate: any = await this.callQuery(`
        SELECT * FROM exchange_rates
        WHERE from_currency = '${fromCurrencyUpper}'
          AND to_currency = '${toCurrencyUpper}'
        ORDER BY updated_at DESC
        LIMIT 1
      `);

      if (cachedRate.length > 0) {
        const rateRow = cachedRate[0];
        const lastUpdated = new Date(rateRow.updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

    //    if (minutesSinceUpdate <= this.cacheDuration) {
          return this.makeResponse(200, "Rate retrieved from cache", {
            ...rateRow,
            cache_age_minutes: Math.round(minutesSinceUpdate * 100) / 100
          });
      //  }
      }

      // Cache expired or doesn't exist, sync fresh rate
      return await this.syncAllRates();
    } catch (error: any) {
      console.error("Error getting rate:", error.message);
      return this.makeResponse(500, "Error retrieving rate", { error: error.message });
    }
  }

  /**
   * Cache rates in database
   */
  async CacheRates(params: any, rateData: any) {
    try {
      const { from_currency, to_currency, rate, rate_type, usd_rate } = params;
      
      await this.callQuery(`
        INSERT INTO exchange_rates (
          from_currency,
          to_currency,
          rate,
          amount,
          markup,
          updated_at
        ) VALUES (
          '${from_currency}',
          '${to_currency}',
          ${rate},
          ${rate},
          0.0,
          ${usd_rate || 'NULL'},
          NOW()
        )
        ON DUPLICATE KEY UPDATE
          rate = ${rate},
          amount = ${rate},
          markup = 0.0,
          updated_at = NOW();
      `);

      console.log(`Cached rate: ${from_currency} -> ${to_currency} = ${rate}`);
      return this.makeResponse(200, "Rate cached successfully", params);
    } catch (error: any) {
      console.error("Error caching rate:", error.message);
      return this.makeResponse(500, "Error caching rate", { error: error.message });
    }
  }

  /**
   * Sync all rates - calls fiat rate and crypto rate functions
   */
  async syncAllRates() {
    try {
      console.log("Starting sync of all rates...");
      
      // Sync fiat rates first
      const fiatRates = await this.getFiatRate('USD');
      if (fiatRates.success && fiatRates.data) {
        const { source, quotes } = fiatRates.data;
        
        for (const [pair, rate] of Object.entries(quotes)) {
          const toCurrency = pair.substring(source.length);
          await this.CacheRates({
            from_currency: source,
            to_currency: toCurrency,
            rate: rate,
            rate_type: 'fiat'
          }, fiatRates.data);
        }
      }

      // Sync crypto rates
      let successCount = 0;
      let errorCount = 0;

      for (const coin of this.supportedCoins) {
        const cryptoRate = await this.getCryptoRate(coin);
        
        if (cryptoRate.success && cryptoRate.data) {
          const usdRate = cryptoRate.data.quote.USD.price;
          
          for (const fiat of this.supportedCurrencies) {
            try {
              let finalRate = usdRate;
              
              if (fiat !== 'USD') {
                // Get fiat conversion rate from cache
                const fiatConversion: any = await this.callQuery(`
                  SELECT rate FROM exchange_rates
                  WHERE from_currency = 'USD' AND to_currency = '${fiat}'
                  AND rate_type = 'fiat'
                  ORDER BY updated_at DESC LIMIT 1
                `);
                
                if (fiatConversion.length > 0) {
                  finalRate = usdRate * parseFloat(fiatConversion[0].rate);
                }
              }

              await this.CacheRates({
                from_currency: coin,
                to_currency: fiat,
                rate: finalRate,
                rate_type: 'crypto',
                usd_rate: usdRate
              }, cryptoRate.data);

              successCount++;
            } catch (error: any) {
              errorCount++;
              console.error(`Error syncing ${coin} -> ${fiat}:`, error.message);
            }
          }
        } else {
          errorCount++;
        }
      }

      return this.makeResponse(200, 'All rates synced successfully', {
        success_count: successCount,
        error_count: errorCount
      });
    } catch (error: any) {
      console.error('Error syncing all rates:', error.message);
      return this.makeResponse(500, 'Failed to sync all rates', { error: error.message });
    }
  }

  /**
   * Get fiat rates from API Layer
   */
  async getFiatRate(baseCurrency: string = 'USD') {
    try {
      const currencies = this.supportedCurrencies.filter(c => c !== baseCurrency).join(',');
      const url = `${this.apiUrl}?access_key=${this.apiKey}&currencies=${currencies}&source=${baseCurrency}&format=1`;
      
      console.log(`Fetching fiat rates from API Layer: ${baseCurrency}`);
      
      const response = await fetch(url);
      const data = await response.json() as FiatRateResponse;
      
      if (!response.ok || !data.success) {
        console.error("API Layer error:", data);
        return {
          success: false,
          error: "Failed to fetch fiat rates from API Layer",
          data: null
        };
      }
      
      console.log(`Successfully fetched ${Object.keys(data.quotes).length} fiat rates`);
      return {
        success: true,
        data: data,
        message: "Fiat rates fetched successfully"
      };
    } catch (error: any) {
      console.error("Error fetching fiat rates:", error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get crypto rate from CoinMarketCap
   */
  async getCryptoRate(cryptoCurrency: string) {
    try {
      console.log(`Fetching crypto rate from CoinMarketCap: ${cryptoCurrency}`);
      
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${cryptoCurrency}&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.coinKey,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `CoinMarketCap API error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const data = await response.json();
      
      if (!data.data || !data.data[cryptoCurrency]) {
        return {
          success: false,
          error: `No data found for ${cryptoCurrency}`,
          data: null
        };
      }

      const coinData = data.data[cryptoCurrency];
      console.log(`Successfully fetched ${cryptoCurrency} rate: $${coinData.quote.USD.price}`);
      
      return {
        success: true,
        data: coinData,
        message: "Crypto rate fetched successfully"
      };
    } catch (error: any) {
      console.error("Error fetching crypto rate:", error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get all active service categories with biller counts
   */
  async getServiceCategories() {
    try {
      const categories: any = await this.callQuery(`
        SELECT 
          sc.id,
          sc.name,
          sc.slug,
          sc.description,
          sc.icon,
          sc.color,
          sc.sort_order,
          COUNT(b.id) as billers_count
        FROM service_categories sc
        LEFT JOIN billers b ON sc.id = b.service_category_id AND b.is_active = 1
        WHERE sc.is_active = 1
        GROUP BY sc.id, sc.name, sc.slug, sc.description, sc.icon, sc.color, sc.sort_order
        ORDER BY sc.sort_order ASC
      `);

      if (categories.length === 0) {
        return this.makeResponse(404, "No service categories found", []);
      }

      return this.makeResponse(200, "Service categories retrieved successfully", categories);
    } catch (error: any) {
      console.error("Error getting service categories:", error.message);
      return this.makeResponse(500, "Error retrieving service categories", { error: error.message });
    }
  }

  /**
   * Get billers by service category
   */
  async getBillersByCategory(categorySlug: string) {
    try {
      if (!categorySlug) {
        return this.makeResponse(400, "Category slug is required", []);
      }

      const billers: any = await this.callQuery(`
        SELECT 
          b.*,
          sc.name as category_name,
          sc.slug as category_slug
        FROM billers b
        JOIN service_categories sc ON b.service_category_id = sc.id
        WHERE b.is_active = 1 
        AND sc.is_active = 1 
        AND sc.slug = '${categorySlug}'
        ORDER BY b.sort_order ASC
      `);

      if (billers.length === 0) {
        return this.makeResponse(404, `No billers found for category: ${categorySlug}`, []);
      }

      return this.makeResponse(200, `Billers for ${categorySlug} retrieved successfully`, billers);
    } catch (error: any) {
      console.error("Error getting billers by category:", error.message);
      return this.makeResponse(500, "Error retrieving billers", { error: error.message });
    }
  }

  /**
   * Get specific biller by ID or slug
   */
  async getBillerById(billerIdentifier: string | number) {
    try {
      if (!billerIdentifier) {
        return this.makeResponse(400, "Biller ID or slug is required", null);
      }

      let whereClause = '';
      if (typeof billerIdentifier === 'number' || !isNaN(Number(billerIdentifier))) {
        whereClause = `b.id = ${billerIdentifier}`;
      } else {
        whereClause = `b.slug = '${billerIdentifier}'`;
      }

      const biller: any = await this.callQuery(`
        SELECT 
          b.*,
          sc.name as category_name,
          sc.slug as category_slug,
          sc.icon as category_icon
        FROM billers b
        JOIN service_categories sc ON b.service_category_id = sc.id
        WHERE b.is_active = 1 
        AND sc.is_active = 1 
        AND ${whereClause}
        LIMIT 1
      `);

      if (biller.length === 0) {
        return this.makeResponse(404, `Biller not found: ${billerIdentifier}`, null);
      }

      return this.makeResponse(200, "Biller retrieved successfully", biller[0]);
    } catch (error: any) {
      console.error("Error getting biller:", error.message);
      return this.makeResponse(500, "Error retrieving biller", { error: error.message });
    }
  }

  /**
   * Get all active billers across all categories
   */
  async getAllBillers() {
    try {
      const billers: any = await this.callQuery(`
        SELECT 
          b.*,
          sc.name as category_name,
          sc.slug as category_slug,
          sc.icon as category_icon
        FROM billers b
        JOIN service_categories sc ON b.service_category_id = sc.id
        WHERE b.is_active = 1 
        AND sc.is_active = 1
        ORDER BY sc.sort_order ASC, b.sort_order ASC
      `);

      if (billers.length === 0) {
        return this.makeResponse(404, "No billers found", []);
      }

      // Group billers by category
      const groupedBillers = billers.reduce((acc: any, biller: any) => {
        const categorySlug = biller.category_slug;
        if (!acc[categorySlug]) {
          acc[categorySlug] = {
            category_name: biller.category_name,
            category_slug: biller.category_slug,
            category_icon: biller.category_icon,
            billers: []
          };
        }
        
        // Remove category info from biller object to avoid duplication
        const { category_name, category_slug, category_icon, ...billerData } = biller;
        acc[categorySlug].billers.push(billerData);
        
        return acc;
      }, {});

      return this.makeResponse(200, "All billers retrieved successfully", {
        total_billers: billers.length,
        grouped_by_category: groupedBillers,
        flat_list: billers
      });
    } catch (error: any) {
      console.error("Error getting all billers:", error.message);
      return this.makeResponse(500, "Error retrieving billers", { error: error.message });
    }
  }

  /**
   * Search billers by name across all categories
   */
  async searchBillers(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return this.makeResponse(400, "Search term must be at least 2 characters", []);
      }

      const searchQuery = searchTerm.trim().toLowerCase();
      const billers: any = await this.callQuery(`
        SELECT 
          b.*,
          sc.name as category_name,
          sc.slug as category_slug,
          sc.icon as category_icon
        FROM billers b
        JOIN service_categories sc ON b.service_category_id = sc.id
        WHERE b.is_active = 1 
        AND sc.is_active = 1 
        AND (
          LOWER(b.name) LIKE '%${searchQuery}%' 
          OR LOWER(b.short_name) LIKE '%${searchQuery}%'
          OR LOWER(b.description) LIKE '%${searchQuery}%'
        )
        ORDER BY 
          CASE 
            WHEN LOWER(b.short_name) LIKE '${searchQuery}%' THEN 1
            WHEN LOWER(b.name) LIKE '${searchQuery}%' THEN 2
            ELSE 3
          END,
          b.sort_order ASC
      `);

      if (billers.length === 0) {
        return this.makeResponse(404, `No billers found for search: ${searchTerm}`, []);
      }

      return this.makeResponse(200, `Found ${billers.length} billers for: ${searchTerm}`, billers);
    } catch (error: any) {
      console.error("Error searching billers:", error.message);
      return this.makeResponse(500, "Error searching billers", { error: error.message });
    }
  }
}

export default payment;
