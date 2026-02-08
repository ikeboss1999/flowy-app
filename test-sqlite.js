const Database = require('better-sqlite3');
const path = require('path');

try {
    console.log('Testing SQLite connection...');
    const db = new Database(':memory:');
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
    db.prepare('INSERT INTO test (value) VALUES (?)').run('Hello World');
    const row = db.prepare('SELECT * FROM test').get();
    console.log('SQLite Test Success:', row);
} catch (error) {
    console.error('SQLite Test Failed:', error);
}
