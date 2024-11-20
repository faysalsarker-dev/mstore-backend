const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("undefind");
    const users = db.collection("users");
    const cards = db.collection("cards");

    app.get("/users", async (req, res) => {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 7; 
        const skip = (page - 1) * limit; 
      
        try {
          const result = await users.find().skip(skip).limit(limit).toArray();
          const totalUsers = await users.countDocuments(); 
          const totalPages = Math.ceil(totalUsers / limit); 
      
          res.send({
            data: result,
            currentPage: page,
            totalPages,
            totalUsers,
          });
        } catch (error) {
          res.status(500).send({ message: 'Error fetching users', error });
        }
      });
      
app.get('/single-user/:id',async(req,res)=>{
  const id= req.params.id
  const query = {_id:new ObjectId(id)}
  const result = await users.findOne(query);
  res.send(result)
})


app.patch("/update-user:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  console.log(data);
  const info = {
    $set: {
      ...data,
    },
  };
  const result = await users.updateOne(query, info, options);
  res.send(result);
});

app.delete('/delete-user:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id:new ObjectId(id)}
  const result = await users.deleteOne(query)
  res.send(result)
})
    // Example in Express.js
    app.post("/check-username", async (req, res) => {
      const { username } = req.body;

      try {
        const userExists = await users.findOne({ username });

        if (userExists) {
          return res.json({ exists: true });
        } else {
          return res.json({ exists: false });
        }
      } catch (error) {
        return res.status(500).json({ message: "Server error", error });
      }
    });

    app.post("/register", async (req, res) => {
      const data = req.body;
      const userExists = await users.findOne({ username: data.username });
      if (userExists) {
        res.send("user Already exist");
      }
      const hash = bcrypt.hashSync(data.password, 10);
      console.log(data, hash);
      const result = await users.insertOne(data);
      res.send(result);
    });

    app.post('/add-cards',async(req,res)=>{
      const data = req.body;
      const result = await cards.insertOne(data);
      res.send(result);
    })
    app.get('/all-cards', async (req, res) => {
      try {
        // Extract query parameters from the URL using req.query
        const {
          page = 1,
          limit = 10,
          sortField = 'createdAt',
          sortOrder = 'desc',
          search = '',
          filter = 'All', // Filter for card types like Visa or MasterCard
          expirySort = 'asc' // Expiry date sort order
        } = req.query;
    
        // Convert pagination parameters to numbers
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
    
        // Validate and sanitize the input values (to prevent invalid queries)
        if (isNaN(pageNumber) || pageNumber <= 0) {
          return res.status(400).json({ message: "Invalid page number" });
        }
        if (isNaN(limitNumber) || limitNumber <= 0) {
          return res.status(400).json({ message: "Invalid limit number" });
        }
    
        // Calculate the number of documents to skip for pagination
        const skip = (pageNumber - 1) * limitNumber;
    
        // Build the search filter (search by card number or other fields)
        const searchFilter = search ? { cardNumber: { $regex: search, $options: 'i' } } : {};
    
        // Build the filter for card types if provided (e.g., Visa or MasterCard)
        const typeFilter = filter !== 'All' ? { type: filter } : {};
    
        // Combine search and type filters
        const combinedFilter = { ...searchFilter, ...typeFilter };
    
        // Build the sort object based on the query
        const sortOptions = {};
        sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
    
        // Add additional sorting for expiry date if needed
        if (sortField !== 'expiryDate' && expirySort) {
          sortOptions['expiryDate'] = expirySort === 'asc' ? 1 : -1;
        }
    
        // Retrieve paginated, sorted, and filtered results
        const result = await cards
          .find(combinedFilter) // Apply both search and type filters
          .sort(sortOptions) // Sort by the requested field and order
          .skip(skip) // Apply pagination skip
          .limit(limitNumber) // Apply pagination limit
          .toArray();
    
        // Get the total count for pagination purposes
        const total = await cards.countDocuments(combinedFilter);
    
        // Send the paginated result along with pagination info
        res.send({
          data: result,
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          totalItems: total,
        });
      } catch (error) {
        res.status(500).send({ message: 'An error occurred while fetching cards.', error });
      }
    });
    

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
