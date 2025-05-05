const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const colors = require('colors');
const connectDB = require("./config/db");
const { loggerMiddleware } = require("./Bucket/Logger");
const path = require('path')
dotenv.config();
const socket = require('./WebSocket');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Initialize a new instance of Socket.IO by passing the HTTP server
const io = socket.init(server); 

io.on("connection", (socket) => {
    // console.log("User connected ", socket.id); // Log the socket ID of the connected user

    // Listen for "send_message" events from the connected client
    socket.on("send_message", (data) => {
        // console.log("Message Received ", data); // Log the received message data

        // Emit the received message data to all connected clients
        io.emit("receive_message", data);
    });
});

app.use(loggerMiddleware);

const UserRoute = require("./routes/UserRoute");
const AdminRoute = require("./routes/AdminRoute");

app.use('/api/user',UserRoute);
app.use('/api/admin',AdminRoute);




app.get("/",(req,res)=>{
    res.send("Welcome to Mothers Day Processing Backend")
})

const port = process.env.PORT || 7700
server.listen(port,()=>{
    console.log(`server is Running on http://localhost:${port}`.bgCyan.black);
})
