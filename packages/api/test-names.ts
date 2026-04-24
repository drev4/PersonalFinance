import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.FINNHUB_API_KEY || '';

async function test(q: string) {
    try {
        const response = await axios.get('https://finnhub.io/api/v1/search', {
            params: { q, token: key }
        });
        console.log(`Results for ${q}:`, response.data.count);
        if (response.data.count > 0) {
            console.log('First result:', response.data.result[0]);
        }
    } catch (err: any) {
        console.error('Error:', err.response?.status);
    }
}

test('Apple');
test('Bitcoin');
test('Vanguard');
