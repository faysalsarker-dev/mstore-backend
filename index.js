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
      const search = req.query.search || "";
      const dateSort = req.query.dateSort || ""; // 'asc' or 'desc'
      const balanceSort = req.query.balanceSort || ""; // 'asc' or 'desc'
    
      try {
        const query = search
          ? { username: { $regex: search, $options: "i" } }
          : {};
    
        const sortOptions = {};
        if (dateSort) sortOptions.createAt = dateSort === "asc" ? 1 : -1;
        if (balanceSort) sortOptions.balance = balanceSort === "asc" ? 1 : -1;
    
        const result = await users
          .find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .toArray();
    
        const totalUsers = await users.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);
    
        res.send({
          data: result,
          currentPage: page,
          totalPages,
          totalUsers,
        });
      } catch (error) {
        res.status(500).send({ message: "Error fetching users", error });
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
    app.get("/all-cards", async (req, res) => {
      try {
        const {
          page = 1,
          limit = 10,
          sortField = "createdAt",
          sortOrder = "desc",
          search = "",
          filter = "All",
          expirySort = "asc",
        } = req.query;
    
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
    
        if (isNaN(pageNumber) || pageNumber <= 0) {
          return res.status(400).json({ message: "Invalid page number" });
        }
        if (isNaN(limitNumber) || limitNumber <= 0) {
          return res.status(400).json({ message: "Invalid limit number" });
        }
    
        const skip = (pageNumber - 1) * limitNumber;
    
        // Search Filter
        const searchFilter = search
          ? { country: { $regex: search, $options: "i" } }
          : {};
    
        // Card Type Filter
        const typeFilter = filter !== "All" ? { type: filter } : {};
    
        const combinedFilter = { ...searchFilter, ...typeFilter };
    
        // Sorting
        const sortOptions = {};
        sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;
        if (sortField !== "expiryDate" && expirySort) {
          sortOptions["expiryDate"] = expirySort === "asc" ? 1 : -1;
        }
    
        const result = await cards
          .find(combinedFilter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNumber)
          .toArray();
    
        const total = await cards.countDocuments(combinedFilter);
    
        res.send({
          data: result,
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          totalItems: total,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while fetching cards.", error });
      }
    });
    // Controller for fetching distinct card types
app.get("/card-types",async (req, res) => {
  try {
    const cardTypes = await cards.distinct("cardType"); 
    res.status(200).json({ success: true, data: cardTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch card types",error });
  }
})

// Route for fetching card types



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
