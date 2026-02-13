import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or .env.local from web
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function applyMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to database');

        const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260213180000_add_slug_to_campaigns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration...');
        const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);

        for (const query of queries) {
            console.log(`Executing: ${query.substring(0, 50)}...`);
            await client.query(query);
        }

        console.log('Migration applied successfully');

    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
