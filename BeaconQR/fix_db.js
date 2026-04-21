const fs = require('fs');
const path = require('path');

// 1. Match the EXACT path from your app.js
// Your code: path.join(__dirname, '..', 'data', 'database.sqlite');
// We assume this script is in the same folder as app.js
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

function fixDatabase() {
    console.log("🔧 Starting Database Fix...");

    try {
        // Step 1: Ensure the 'data' folder exists
        // If this folder is missing, SQLite cannot create the file inside it.
        if (!fs.existsSync(dataDir)) {
            console.log(`   Creating missing directory: ${dataDir}`);
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Step 2: Delete the corrupted database file
        if (fs.existsSync(dbPath)) {
            console.log(`   Found corrupted file at: ${dbPath}`);
            fs.unlinkSync(dbPath);
            console.log("   🗑️  Deleted corrupted database file.");
        } else {
            console.log("   No database file found (clean start).");
        }

        console.log("\n✅ SUCCESS: You can now start your server with 'npm start' or 'node app.js'");
        console.log("   Your app.js will automatically recreate the tables correctly.");

    } catch (err) {
        console.error("❌ Error fixing database:", err);
    }
}

fixDatabase();