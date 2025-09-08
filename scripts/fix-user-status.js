#!/usr/bin/env node

// Script to fix user status issue - adds isActive field to existing users
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://user0:user0@cluster0.c2k6hmp.mongodb.net/clothing_store?retryWrites=true&w=majority&appName=Cluster0';

async function fixUserStatus() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find all users that don't have isActive field or have it set to false/null/undefined
    const usersWithoutStatus = await usersCollection.find({
      $or: [
        { isActive: { $exists: false } },
        { isActive: null },
        { isActive: undefined }
      ]
    }).toArray();
    
    console.log(`Found ${usersWithoutStatus.length} users without proper isActive status`);
    
    if (usersWithoutStatus.length > 0) {
      // Update all users to have isActive: true (default active status)
      const result = await usersCollection.updateMany(
        {
          $or: [
            { isActive: { $exists: false } },
            { isActive: null },
            { isActive: undefined }
          ]
        },
        {
          $set: { isActive: true }
        }
      );
      
      console.log(`Updated ${result.modifiedCount} users to have isActive: true`);
    }
    
    // Also fix the one user that was explicitly set to false (if that was unintentional)
    const suspendedUsers = await usersCollection.find({ isActive: false }).toArray();
    console.log(`Found ${suspendedUsers.length} users with isActive: false`);
    
    if (suspendedUsers.length > 0) {
      console.log('Users currently suspended:');
      suspendedUsers.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName})`);
      });
      
      // Uncomment the next lines if you want to activate all suspended users too
      // const activateResult = await usersCollection.updateMany(
      //   { isActive: false },
      //   { $set: { isActive: true } }
      // );
      // console.log(`Activated ${activateResult.modifiedCount} previously suspended users`);
    }
    
    // Verify the fix
    const allUsers = await usersCollection.find({}).toArray();
    console.log('\nFinal user status:');
    allUsers.forEach(user => {
      console.log(`- ${user.email}: isActive = ${user.isActive}`);
    });
    
  } catch (error) {
    console.error('Error fixing user status:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

fixUserStatus();
