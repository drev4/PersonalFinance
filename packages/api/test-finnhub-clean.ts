import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.FINNHUB_API_KEY || '';
console.log('Testing key:', key);

async function test() {
    try {
        const response = await axios.get('https://finnhub.io/api/v1/search', {
            params: { q: 'AAPL', token: key }
        });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error('Error:', err.response?.status, err.response?.data);
    }
}

test();
