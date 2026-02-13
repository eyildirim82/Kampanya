
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log('Connected to DB');

    try {
        console.log('Checking if slug column exists...');
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'slug'");

        if (res.rowCount === 0) {
            console.log('Adding slug column...');
            await client.query("ALTER TABLE campaigns ADD COLUMN slug TEXT UNIQUE");
            console.log('Added slug column');
        } else {
            console.log('Slug column already exists');
        }

        console.log('Initializing slugs...');
        // Simplified slugification logic for SQL
        await client.query(`
            UPDATE campaigns 
            SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) 
            WHERE slug IS NULL
        `);

        await client.query(`
            UPDATE campaigns 
            SET slug = REGEXP_REPLACE(slug, '^-+|-+$', '', 'g') 
            WHERE slug IS NOT NULL
        `);
        console.log('Slugs initialized');

        const finalCheck = await client.query("SELECT id, name, slug FROM campaigns LIMIT 5");
        console.log('Sample data:', finalCheck.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
