import axios from 'axios';
import config from '../config';

class OddsApiHelper {
  apiKey: string;
  client: any;
  
  constructor() {
    this.apiKey = config.oddsApiKey;
    if (!this.apiKey) {
      console.warn('ODDS_API_KEY not set. Sports data will use fallback.');
      return;
    }
    
    this.client = axios.create({
      baseURL: 'https://api.the-odds-api.com/v4',
      timeout: 10000,
      params: { apiKey: this.apiKey }
    });
    
    this.client.interceptors.response.use(
      (response: any) => {
        const remaining = response.headers['x-requests-remaining'];
        const used = response.headers['x-requests-used'];
        if (remaining !== undefined) {
          console.log(`Odds API Rate Limit - Remaining: ${remaining}, Used: ${used}`);
        }
        return response;
      },
      (error: any) => Promise.reject(error)
    );
  }

  async getSports() {
    if (!this.apiKey) {
      throw new Error('Odds API key not configured');
    }
    try {
      const { data } = await this.client.get('/sports');
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getEvents(sportKey: string, options:any = {}) {
    try {
      const params = { regions: options.regions || 'us', dateFormat: options.dateFormat || 'iso' };
      const { data } = await this.client.get(`/events/${encodeURIComponent(sportKey)}/`, { params });
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getOddsBySport(sportKey: string, options:any = {}) {
    try {
      const params = {
        regions: options.regions || 'us',
        markets: options.markets || 'h2h',
        dateFormat: options.dateFormat || 'iso',
        oddsFormat: options.oddsFormat || 'decimal'
      };
      const { data } = await this.client.get(`/sports/${encodeURIComponent(sportKey)}/odds/?apiKey=${this.apiKey}`, { params });
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getOddsByEvent(eventId: string, options:any = {}) {
    try {
      const params = { markets: options.markets || 'h2h', dateFormat: options.dateFormat || 'iso', oddsFormat: options.oddsFormat || 'decimal' };
      const { data } = await this.client.get(`/events/${encodeURIComponent(eventId)}/odds/?apiKey=${this.apiKey}`, { params });
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getScores(sportKey?: string) {
    try {
      const url = sportKey ? `/sports/${encodeURIComponent(sportKey)}/scores/?apiKey=${this.apiKey}` : '/scores/?apiKey=${this.apiKey}';
      const { data } = await this.client.get(url);
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getParticipants() {
    try {
      const { data } = await this.client.get('/participants/?apiKey=' + this.apiKey);
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  handleError(error: any    ) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(`API Error ${status}: ${message}`);
    }
    throw error;
  }


  async getTop5PopularGamesToday(days = 7, limit = 5, bookmakerKey = 'pinnacle') {
    if (!this.apiKey) {
      throw new Error('Odds API key not configured');
    }
    console.log("days", this.apiKey);
    try {
      // Expanded list of popular sports for better coverage
      const sports = [
        'soccer_uefa_champs_league',
        'soccer_epl',
        'soccer_fa_cup',
        'soccer_spain_la_liga',
        'soccer_germany_bundesliga',
        'soccer_italy_serie_a',
        'soccer_france_ligue_one',
        'americanfootball_nfl',
        'basketball_nba',
        'icehockey_nhl'
      ];

      // Get odds for all sports with error handling
      const sportsResults = await Promise.allSettled(
        sports.map(s =>
          this.getOddsBySport(s, {
            regions: 'us,uk',
            markets: 'h2h',
            dateFormat: 'iso',
            oddsFormat: 'decimal'
          })
        )
      );
      console.log("sportsResults", sportsResults);

      // Filter successful results and flatten
      const allEvents = sportsResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value || [])
        .flat()
        .filter(event => event && event.bookmakers); // Filter out invalid events

      if (allEvents.length === 0) {
        console.log('No events found for any sports');
        return [];
      }

      // Start from 24 hours from now to give proper lead time
      const now = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
      const end = Date.now() + days * 864e5; // 864e5 = milliseconds in a day

      const windowEvents = allEvents.filter(ev => {
        if (!ev.commence_time) return false;
        const t = new Date(ev.commence_time).getTime();
        return t >= now && t < end;
      });

      console.log(`Found ${windowEvents.length} events in the next ${days} days`);

      if (windowEvents.length === 0) {
        return [];
      }

      // Sort by number of bookmakers (popularity indicator)
      const topEvents = windowEvents
        .sort((a, b) => (b.bookmakers?.length || 0) - (a.bookmakers?.length || 0))
        .slice(0, limit);

      // Process events with better error handling - return objects with question and start time
      return topEvents.map(ev => {
        try {
          // Validate event structure
          if (!ev.bookmakers || !Array.isArray(ev.bookmakers) || ev.bookmakers.length === 0) {
            return null;
          }

          // Find preferred bookmaker or fall back to first available
          const book = ev.bookmakers.find(b => b.key === bookmakerKey) || ev.bookmakers[0];
          
          if (!book || !book.markets || !Array.isArray(book.markets)) {
            return null;
          }

          // Find head-to-head market
          const h2hMarket = book.markets.find(m => m.key === 'h2h');
          if (!h2hMarket || !h2hMarket.outcomes || !Array.isArray(h2hMarket.outcomes)) {
            return null;
          }

          // Find outcome closest to even odds (2.0)
          const chosen = h2hMarket.outcomes.reduce((a, b) =>
            Math.abs(a.price - 2.0) < Math.abs(b.price - 2.0) ? a : b
          );

          if (!chosen || !chosen.name || !chosen.price) {
            return null;
          }

          // Format the betting question
          let question = '';
          if (chosen.name === 'Draw') {
            question = `Will ${ev.home_team} and ${ev.away_team} draw? (odds: ${chosen.price.toFixed(2)})`;
          } else {
            const opponent = chosen.name === ev.home_team ? ev.away_team : ev.home_team;
            question = `Will ${chosen.name} beat ${opponent}? (odds: ${chosen.price.toFixed(2)})`;
          }

          // Return object with question and actual game start time
          return {
            question: question,
            gameStartTime: ev.commence_time
          };
          
        } catch (error) {
          console.error('Error processing event:', error);
          return null;
        }
      }).filter(result => result !== null); // Filter out null results

    } catch (error) {
      console.error('Error in getTop5PopularGamesToday:', error);
      throw new Error('Failed to fetch popular games: ' + error.message);
    }
  }
  
  

 



}

export default OddsApiHelper;
