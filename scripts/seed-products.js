#!/usr/bin/env node

// Product Seeding Script for E-Commerce Store
// This script seeds test products across different categories using admin accounts

const axios = require('axios');
const fs = require('fs');

// Admin credentials and tokens
const adminAccounts = {
  admin1: {
    email: "admin@example.com",
    password: "Admin12345",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3M2FmNjg5YTk5N2VlYTA4MGRlMzkiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU2ODgzOTAyLCJleHAiOjE3NTY5NzAzMDJ9.V-RS9H4HORlxh8_7Rl226a0t-YiKscxfzYGnS0u9_fQ"
  },
  admin2: {
    email: "admin2@example.com", 
    password: "Admin12345",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3NDM5ZjQ4MTg0ZDFlNWFkMjhhZmIiLCJlbWFpbCI6ImFkbWluMkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1Njg4NDA4NywiZXhwIjoxNzU2OTcwNDg3fQ.mcRUBb1msIqPfA-ne4gYaGrmwZaLC3VVGMqStyaEppA"
  },
  superAdmin: {
    email: "superadmin@example.com",
    password: "SuperAdmin123", 
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGI3M2QyYzg5YTk5N2VlYTA4MGRlNTIiLCJlbWFpbCI6InN1cGVyYWRtaW5nQGV4YW1wbGUuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNzU2ODg0Mjc1LCJleHAiOjE3NTY5NzA2NzV9.IhHzkYA52JEyEYpY_2MKl8SB2RCSImRpIkqX2upB_6Y"
  }
};

// Base URL
const BASE_URL = 'http://localhost:3000';

// Test products data for each category
const testProducts = {
  Casual: [
    {
      name: "Cotton T-Shirt",
      description: "Comfortable cotton t-shirt perfect for daily wear. Soft fabric with excellent breathability.",
      price: 25.99,
      salePrice: 19.99,
      category: "Casual",
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["White", "Black", "Navy", "Gray"],
      stock: 50,
      admin: "admin1"
    },
    {
      name: "Denim Jeans",
      description: "Classic blue denim jeans with modern fit. Durable and stylish for everyday occasions.",
      price: 79.99,
      category: "Casual", 
      sizes: ["28", "30", "32", "34", "36"],
      colors: ["Blue", "Black", "Light Blue"],
      stock: 30,
      admin: "admin1"
    },
    {
      name: "Casual Hoodie",
      description: "Warm and cozy hoodie with front pocket. Perfect for cool weather and relaxed settings.",
      price: 45.99,
      salePrice: 35.99,
      category: "Casual",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Gray", "Black", "Navy", "Maroon"],
      stock: 25,
      admin: "admin2"
    },
    {
      name: "Casual Sneakers",
      description: "Comfortable white sneakers perfect for everyday wear. Versatile design matches any outfit.",
      price: 89.99,
      category: "Casual",
      sizes: ["7", "8", "9", "10", "11"],
      colors: ["White", "Black", "Gray"],
      stock: 40,
      admin: "admin2"
    }
  ],
  
  Formal: [
    {
      name: "Business Shirt",
      description: "Professional dress shirt made from premium cotton. Perfect for office and formal events.",
      price: 59.99,
      category: "Formal",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["White", "Blue", "Light Blue", "Pink"],
      stock: 35,
      admin: "superAdmin"
    },
    {
      name: "Formal Blazer",
      description: "Elegant blazer crafted from high-quality fabric. Essential piece for professional wardrobe.",
      price: 149.99,
      salePrice: 119.99,
      category: "Formal",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Navy", "Charcoal"],
      stock: 20,
      admin: "superAdmin"
    },
    {
      name: "Dress Pants",
      description: "Tailored dress pants with perfect fit. Ideal for business meetings and formal occasions.",
      price: 69.99,
      category: "Formal",
      sizes: ["30", "32", "34", "36", "38"],
      colors: ["Black", "Navy", "Charcoal", "Gray"],
      stock: 28,
      admin: "admin1"
    },
    {
      name: "Oxford Shoes",
      description: "Classic leather oxford shoes. Timeless design perfect for formal and business attire.",
      price: 129.99,
      category: "Formal",
      sizes: ["7", "8", "9", "10", "11", "12"],
      colors: ["Black", "Brown", "Tan"],
      stock: 15,
      admin: "admin1"
    }
  ],
  
  Party: [
    {
      name: "Sequin Dress",
      description: "Glamorous sequin dress perfect for parties and special events. Eye-catching design with elegant fit.",
      price: 89.99,
      salePrice: 69.99,
      category: "Party",
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Gold", "Silver", "Black", "Rose Gold"],
      stock: 22,
      admin: "admin2"
    },
    {
      name: "Party Heels",
      description: "Stylish high heels perfect for parties and night out. Comfortable design with elegant appeal.",
      price: 79.99,
      category: "Party",
      sizes: ["6", "7", "8", "9", "10"],
      colors: ["Black", "Red", "Gold", "Silver"],
      stock: 18,
      admin: "admin2"
    },
    {
      name: "Cocktail Shirt",
      description: "Trendy shirt designed for parties and social events. Modern cut with attention to detail.",
      price: 49.99,
      category: "Party",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "White", "Red", "Navy"],
      stock: 30,
      admin: "superAdmin"
    },
    {
      name: "Evening Clutch",
      description: "Elegant clutch bag perfect for evening events. Compact design with sophisticated style.",
      price: 39.99,
      salePrice: 29.99,
      category: "Party",
      sizes: ["One Size"],
      colors: ["Black", "Gold", "Silver", "Red"],
      stock: 25,
      admin: "superAdmin"
    }
  ],
  
  Gym: [
    {
      name: "Workout T-Shirt",
      description: "Moisture-wicking athletic t-shirt designed for intense workouts. Breathable fabric keeps you cool.",
      price: 29.99,
      category: "Gym",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      colors: ["Black", "Gray", "Navy", "Red"],
      stock: 45,
      admin: "admin1"
    },
    {
      name: "Athletic Leggings",
      description: "High-performance leggings with compression fit. Perfect for yoga, running, and gym workouts.",
      price: 39.99,
      salePrice: 32.99,
      category: "Gym",
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Black", "Gray", "Navy", "Purple"],
      stock: 35,
      admin: "admin1"
    },
    {
      name: "Running Shoes",
      description: "Professional running shoes with advanced cushioning. Designed for comfort during long workouts.",
      price: 119.99,
      category: "Gym",
      sizes: ["7", "8", "9", "10", "11", "12"],
      colors: ["Black", "White", "Red", "Blue"],
      stock: 20,
      admin: "admin2"
    },
    {
      name: "Sports Bra",
      description: "High-support sports bra designed for intense workouts. Comfortable fit with moisture-wicking technology.",
      price: 34.99,
      category: "Gym",
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Black", "White", "Pink", "Gray"],
      stock: 30,
      admin: "admin2"
    }
  ]
};

// Helper function to create product
async function createProduct(productData, adminToken) {
  try {
    const response = await axios.post(`${BASE_URL}/products`, productData, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create product "${productData.name}":`, error.response?.data?.message || error.message);
    return null;
  }
}

// Helper function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main seeding function
async function seedProducts() {
  console.log('🌱 Starting product seeding...\n');
  
  let totalCreated = 0;
  let totalFailed = 0;
  
  // Seed products for each category
  for (const [category, products] of Object.entries(testProducts)) {
    console.log(`📦 Seeding ${category} products...`);
    
    for (const product of products) {
      const adminToken = adminAccounts[product.admin].token;
      
      // Remove admin field from product data
      const { admin, ...productData } = product;
      
      console.log(`  Creating: ${productData.name}`);
      
      const result = await createProduct(productData, adminToken);
      
      if (result) {
        console.log(`  ✅ Created: ${productData.name} (ID: ${result._id})`);
        totalCreated++;
      } else {
        console.log(`  ❌ Failed: ${productData.name}`);
        totalFailed++;
      }
      
      // Add small delay to prevent overwhelming the server
      await delay(500);
    }
    
    console.log(`📦 Completed ${category} category\n`);
  }
  
  // Summary
  console.log('🎉 Seeding completed!');
  console.log(`✅ Successfully created: ${totalCreated} products`);
  console.log(`❌ Failed to create: ${totalFailed} products`);
  console.log(`📊 Total products across 4 categories: ${totalCreated + totalFailed}`);
  
  if (totalCreated > 0) {
    console.log('\n🛒 You can now test the cart functionality with these products!');
    console.log('💡 Use GET /products to see all seeded products');
    console.log('💡 Use GET /products/categories to see available categories');
  }
}

// Run the seeding script
if (require.main === module) {
  seedProducts().catch(error => {
    console.error('💥 Seeding script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { seedProducts, testProducts, adminAccounts };
