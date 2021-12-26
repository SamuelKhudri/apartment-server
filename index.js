const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const { MongoClient } = require('mongodb');
const fileUpload = require('express-fileupload');
const ObjectId = require('mongodb').ObjectId;
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const PORT = process.env.PORT || 5000;

// add middleware
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(fileUpload());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h3xh8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run(){
    try{
        await client.connect();
        const database = client.db('Apartment');
        const serviceCollection = database.collection('Services');
        const reviewCollection = database.collection('Reviews');
        const userCollection = database.collection('Users');
        const orderCollection = database.collection('Orders');
        // get properties
        app.get('/properties',async(req,res) => {
            const result = await serviceCollection.find({}).limit(6).toArray();
            res.json(result)
        });
        // get all properties
        app.get('/allProperties',async(req,res) => {
            const result = await serviceCollection.find({}).toArray();
            res.json(result)
        });
        // get single property
        app.get('/property/:id',async(req,res) => {
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await serviceCollection.findOne(query);
            res.json(result)
            // console.log(id)
        })
        // add service post 
        app.post('/addService',async(req,res) => {
            const serviceName = req.body.serviceName;
            const price = req.body.price;
            const description = req.body.description;
            const image = req.files.image;
            const imageData = image.data;
            const encodedImage = imageData.toString('base64');
            const imageBuffer = Buffer.from(encodedImage,'base64');
            const service = {
                name:serviceName,
                price:price,
                description:description,
                image:imageBuffer
            }
            const result = await serviceCollection.insertOne(service);
            res.json(result)
        });
        // review post
        app.post('/review',async(req,res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            // console.log(result)
            res.json(result)
        });
        // review get
        app.get('/review',async(req,res) => {
            const result = await reviewCollection.find({}).toArray();
            res.json(result)
        });
        // users post api
        app.post('/user',async(req,res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result)
        });
        // place Order post 
        app.post('/placeOrder',async(req,res) => {
            const orderItem = req.body;
            const result = await orderCollection.insertOne(orderItem);
            // console.log(result)
            res.json(result)
        });
        // my Order get
        app.get('/myOrder/:id',async(req,res) => {
            const email = req.params.id;
            const query = {userEmail:email};
            // console.log(email,query)
            const result = await orderCollection.find(query).toArray();
            res.json(result)
        });
        // order list  get api
        app.get('/orderList',async(req,res) => {
            const result = await orderCollection.find({}).toArray();
            res.json(result)
        })
        // admin role
        app.get('/addAdmin/:email',async(req,res) => {
            const email = req.params.email;
            const query = {email:email};
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin'){
                isAdmin = true
            }
            res.json({admin:isAdmin})
        });
        // delete my Order
        app.delete('/deleteOrder/:id',async(req,res) => {
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.json(result)
        });
        // makeAdmin check
        app.put('/addAdmin/:email',async(req,res) => {
            const email = req.params.email;
            const filter = {email:email};
            const updateDoc = {
                $set:{role:'admin'}
            }
            const result = await userCollection.updateOne(filter,updateDoc);
            console.log(result)
            res.json(result)
        });
        // bookService get
        app.get('/bookService/:serviceName',async(req,res) => {
            const name = req.params.serviceName;
            const query = {name:name}
            const result = await serviceCollection.findOne(query);
            // console.log(result)
            res.json(result)
        });
        // /create-payment-intent
        app.post('/create-payment-intent',async(req,res) => {
            const paymentInfo = req.body;
            const paymentAmount = parseInt(paymentInfo?.price)
            const amount = paymentAmount*100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount:amount,
                payment_method_types:['card']
            });
            res.json({clientSecret: paymentIntent.client_secret});
            // console.log({clientSecret: paymentIntent.client_secret})
        });
        // put api
        app.put('/ordersProperty/:id',async(req,res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updateDoc = {
                $set:{
                    payment:payment
                }
            }
            const result = await serviceCollection.updateOne(filter,updateDoc);
            res.json(result)
        })
    }
    finally{
        // await client.close()
    }
}

run().catch(console.dir);

app.get('/',(req,res) => {
    res.send('Hello Apartment sales server')
})

app.listen(process.env.PORT || 5000,() => {
    console.log('Server side running',PORT)
})