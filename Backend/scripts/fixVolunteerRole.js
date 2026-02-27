/**
 * Migration Script: Fix Volunteer Role Typo
 * 
 * This script updates all users with role "volentieer" to "volunteer"
 * Run once after deployment to fix existing data.
 * 
 * Usage: node Backend/scripts/fixVolunteerRole.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/FORISSWELL";

async function fixVolunteerRole() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("Searching for users with misspelled 'volentieer' role...");
    
    // Find all users with the typo
    const usersWithTypo = await User.find({ role: "volentieer" });
    
    console.log(`Found ${usersWithTypo.length} users with misspelled role\n`);

    if (usersWithTypo.length === 0) {
      console.log("✅ No users to update. All roles are correct.");
      await mongoose.connection.close();
      return;
    }

    // Update each user
    let updated = 0;
    for (const user of usersWithTypo) {
      console.log(`Updating user: ${user.email} (${user.fullName})`);
      user.role = "volunteer";
      await user.save();
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} user(s)`);
    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  }
}

// Run the migration
fixVolunteerRole();
