import mongoose from 'mongoose';
import { getTransactions } from './src/modules/transactions/transaction.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finanzas?directConnection=true');
    console.log('Connected');

    const userId = '69e90ffad16916d16bcd5077';
    const result = await getTransactions(userId, {});
    console.log('Result:', JSON.stringify(result, null, 2));

    await mongoose.disconnect();
}

test().catch(console.error);
