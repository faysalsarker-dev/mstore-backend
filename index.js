const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
