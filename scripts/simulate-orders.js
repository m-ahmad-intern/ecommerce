const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

async function simulateOrderDelivery() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    // Get all orders that are not delivered or cancelled
    const orders = await ordersCollection.find({
      status: { $nin: ['delivered', 'cancelled'] }
    }).toArray();
    
    console.log(`Found ${orders.length} orders to simulate delivery`);
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Simulate different delivery times over the past month
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() - Math.floor(Math.random() * 30)); // Random day in past 30 days
      
      // Update order status to delivered and set tracking info
      await ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'delivered',
            trackingNumber: `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`,
            deliveredAt: deliveryDate,
            // Add delivery notes
            orderNotes: (order.orderNotes || '') + `\n[${new Date().toISOString()}] Order delivered successfully via simulation script`
          }
        }
      );
      
      console.log(`✓ Delivered order ${order.orderNumber} - Revenue: $${order.total}`);
    }
    
    // Create some additional sample orders for better analytics
    const sampleOrders = [];
    const userIds = await db.collection('users').find({ role: 'user' }).limit(5).toArray();
    const products = await db.collection('products').find({ isActive: true }).limit(10).toArray();
    
    if (userIds.length > 0 && products.length > 0) {
      for (let i = 0; i < 5; i++) {
        const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60)); // Random day in past 60 days
        
        const subtotal = randomProduct.price * quantity;
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax;
        
        const newOrder = {
          userId: randomUser._id,
          orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          items: [{
            productId: randomProduct._id,
            productName: randomProduct.name,
            productImage: randomProduct.images[0] || '/images/placeholders/product.png',
            price: randomProduct.price,
            quantity: quantity,
            size: randomProduct.sizes ? randomProduct.sizes[0] : undefined,
            color: randomProduct.colors ? randomProduct.colors[0] : undefined
          }],
          subtotal: subtotal,
          tax: tax,
          total: total,
          status: 'delivered',
          trackingNumber: `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`,
          shippingAddress: {
            fullName: `${randomUser.firstName} ${randomUser.lastName}`,
            phoneNumber: '+1234567890',
            streetAddress: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'United States'
          },
          orderNotes: 'Simulated order for dashboard analytics',
          createdAt: orderDate,
          updatedAt: new Date(),
          deliveredAt: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000) // Delivered 3 days after order
        };
        
        sampleOrders.push(newOrder);
      }
      
      if (sampleOrders.length > 0) {
        await ordersCollection.insertMany(sampleOrders);
        console.log(`✓ Created ${sampleOrders.length} additional sample orders`);
      }
    }
    
    // Summary
    const totalOrders = await ordersCollection.countDocuments();
    const deliveredOrders = await ordersCollection.countDocuments({ status: 'delivered' });
    const totalRevenue = await ordersCollection.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray();
    
    console.log('\n📊 SIMULATION COMPLETE');
    console.log(`Total Orders: ${totalOrders}`);
    console.log(`Delivered Orders: ${deliveredOrders}`);
    console.log(`Total Revenue: $${totalRevenue[0]?.total?.toFixed(2) || '0.00'}`);
    console.log('\n🚀 Dashboard analytics should now show updated data!');
    
  } catch (error) {
    console.error('Error simulating orders:', error);
  } finally {
    await client.close();
  }
}

// Run the simulation
simulateOrderDelivery().catch(console.error);
