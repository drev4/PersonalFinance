import axios from 'axios';
import pino from 'pino';

const logger = pino();

async function getLatestQuotes(symbols: string[]) {
    // Mock getLatestQuotes return empty
    return {};
}

async function fetchCryptoPrice(symbol: string): Promise<number | undefined> {
    const normalised = symbol.toUpperCase();
    try {
        const quotes = await getLatestQuotes([normalised]);
        const quote = (quotes as any)[normalised];
        if (quote !== undefined) {
            return Math.round(quote.price * 100);
        }

        console.log('Falling back to CoinGecko for', normalised);
        const searchRes = await axios.get('https://api.coingecko.com/api/v3/search', {
            params: { query: normalised },
        });

        const coin = (searchRes.data as any).coins.find((c: any) => c.symbol.toUpperCase() === normalised);
        if (!coin) {
            console.log('Coin not found in CG');
            return undefined;
        }

        console.log('Found coin on CG:', coin.id);
        const priceRes = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: { ids: coin.id, vs_currencies: 'eur' },
        });

        const eurPrice = (priceRes.data as any)[coin.id]?.eur;
        if (eurPrice !== undefined) {
            return Math.round(eurPrice * 100);
        }
        return undefined;
    } catch (err) {
        console.error('Error fetching price:', err);
        return undefined;
    }
}

fetchCryptoPrice('BTC').then(p => console.log('Price for BTC:', p));
