const express = require("express");
// const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.DB_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};
const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const serviceAccount = require('./unknown-2b585-firebase-adminsdk-sz7xw-85e07f7cbe.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const authAdmin = admin.auth();

async function run() {
  try {
    const db = client.db("undefind");
    const users = db.collection("users");
    const cards = db.collection("cards");
    const account = db.collection("account");
    const note = db.collection("note");
    const request = db.collection("request");

//------------- user ------------
    app.delete('/delete-user/:uid', async (req, res) => {
      const { uid } = req.params;
      console.log('Email to delete:', uid);
    
      try {
        await authAdmin.deleteUser(uid);
        return res.status(200).send('User deleted successfully'); 
      } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).send('Error deleting user'); 
      }
    });
    
    

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_SECRET);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });



   
    const verifyAdmin = async (req, res, next) => {
      const user = req.user;
      const query = { email: user?.email };
      const result = await users.findOne(query);

      if (!result || result?.role !== "admin")
        


        return res.status(401).send({ message: "unauthorized access!!" });

      next();
    };


   






//------------- user ------------

//--------- authentication------------
app.post("/register", async (req, res) => {
  const data = req.body;
  const userExists = await users.findOne({ username: data.username });
  if (userExists) {
    res.send("user Already exist");
  }

  const result = await users.insertOne(data);
  res.send(result);
});



app.post("/logout", async (req, res) => {
  const user = req.body;
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});




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
//--------- authentication------------
    app.get("/users", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 7;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";
     
    
      try {
        const query = search
          ? { username: { $regex: search, $options: "i" } }
          : {};
    
       
    
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
    
        // Search Filter (by country)
        const searchFilter = search
          ? { country: { $regex: search, $options: "i" } }
          : {};
    
        // Card Type Filter (visa, masterCard, etc.)
        const typeFilter = filter !== "All" ? { cardType: filter } : {};
    
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
app.post('/add-account',async(req,res)=>{
  const data = req.body;
  const result = await account.insertOne(data);
  res.send(result)

})

app.get('/account-details',async(req,res)=>{
  const result= await account.find().toArray();
  res.send(result);
})
app.delete('/account-delete/:id',async(req,res)=>{
const id = req.params.id;
const query = {_id:new ObjectId(id)}
const result = await account.deleteOne(query)
  res.send(result);
})

app.get('/dashboard',async(req,res)=>{
  const totalUsers = await users.find().toArray();
  const totalCards = await cards.find().toArray();
  const totalAccount = await account.find().toArray();
  const totalNote = await note.find().toArray();
  res.send({
    users:totalUsers,
    cards:totalCards,
    account:totalAccount,
    note:totalNote
  });
})


app.patch("/update-card:id", async (req, res) => {
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
  const result = await cards.updateOne(query, info, options);
  res.send(result);
});


// Route for fetching card types
app.post('/add-note',async(req,res)=>{
  const data = req.body;
  const result = await note.insertOne(data);
  res.send(result)

})

app.get('/note-details',async(req,res)=>{
  const result= await note.find().toArray();
  res.send(result);
})
app.delete('/note-delete/:id',async(req,res)=>{
const id = req.params.id;
const query = {_id:new ObjectId(id)}
const result = await note.deleteOne(query)
  res.send(result);
})



app.patch("/update-card:id", async (req, res) => {
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
  const result = await cards.updateOne(query, info, options);
  res.send(result);
});


// Route for fetching card types
app.post('/add-request',async(req,res)=>{
  const data = req.body;
  const result = await request.insertOne(data);
  res.send(result)

})

app.get('/request-details',async(req,res)=>{
  const result= await request.find().toArray();
  res.send(result);
})
app.delete('/request-delete/:id',async(req,res)=>{
const id = req.params.id;
const query = {_id:new ObjectId(id)}
const result = await request.deleteOne(query)
  res.send(result);
})


app.patch("/request-update/:id", async (req, res) => {
  const id = req.params.id;
  const { amount, username } = req.body;


  try {
    console.log(`Updating request ${id} for user ${username}`);

    // Update user balance and status
    const userQuery = { username: username };
    const userUpdate = {
      $inc: { balance: parseFloat(amount) }, 
      $set: { status: "active" },
    };
    const userResult = await users.updateOne(userQuery, userUpdate);

    // Update request status
    const requestQuery = { _id: new ObjectId(id) };
    const requestUpdate = {
      $set: { status: "active" },
    };
    const requestResult = await request.updateOne(requestQuery, requestUpdate);

   

    
    res.send(requestResult);
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).send({ success: false, error: "Internal server error" });
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
