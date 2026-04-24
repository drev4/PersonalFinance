import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.FINNHUB_API_KEY || '';

async function test(symbol: string) {
    try {
        const response = await axios.get('https://finnhub.io/api/v1/quote', {
            params: { symbol, token: key }
        });
        console.log(`Quote for ${symbol}:`, JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error('Error:', err.response?.status, err.response?.data);
    }
}

test('AAPL');
test('SAN.MC'); // Banco Santander
test('BTCUSDT'); // Some crypto support?
