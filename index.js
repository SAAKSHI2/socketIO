const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/mongo-adapter");
const { MongoClient } = require("mongodb");
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Emitter } = require("@socket.io/mongo-emitter");


const DB = "ChatApp";
const COLLECTION = "socket.io-adapter-event";

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server);

// const io = new Server();
// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


// Connect to MongoDB
mongoose.connect('mongodb+srv://reservationDatabase:reservationDatabase@cluster0.t204y5x.mongodb.net/ChatApp?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB chats'))
  .catch(err => console.error('Error connecting to MongoDB:', err));


const mongoClient = new MongoClient("mongodb+srv://reservationDatabase:reservationDatabase@cluster0.t204y5x.mongodb.net/socketioevent?retryWrites=true&w=majority");

const mongoCollection = mongoClient.db(DB).collection(COLLECTION);
const main = async () => {
  await mongoClient.connect();

  try {
    await mongoClient.db(DB).createCollection(COLLECTION, {
      capped: true,
      size: 1e6
    });
    console.log("created events collections");
  } catch (e) {
    // collection already exist
    console.log("already exits");
  }
//   const mongoCollection = mongoClient.db(DB).collection(COLLECTION);
  

  io.adapter(createAdapter(mongoCollection));

}

main();
const emitter = new Emitter(mongoCollection);


// Define message schema
const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  groupName: String,
  timestamp: { type: Date, default: Date.now }
});

// MongoDB adapter for Socket.IO
// const mongoURI = 'mongodb+srv://reservationDatabase:reservationDatabase@cluster0.t204y5x.mongodb.net/socketioevent?retryWrites=true&w=majority';
// const mongoCollection = 'socketio'; // This collection will be created automatically
// const mongoAdapter = createAdapter(mongoURI, {
//   collectionName: mongoCollection
// });
// io.adapter(mongoAdapter);



const Message = mongoose.model('Message', messageSchema);



// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('User connected'+ socket.id);
  const mainAdapter = io.of("/").adapter;

  //  // Listen for the "create-room" event
  //  io.of("/").adapter.on("create-room", (room) => {
  //   console.log(`Room ${room} was created`);
  //   // Emit a message to all sockets in the room except the sender
  //   io.to(room).emit("room-created", `Room ${room} was created`);
  // });

  // Listen for the "join-room" event
  // io.of("/").adapter.on("join-room", (room, id) => {
  //   console.log(`Socket ${id} has joined room ${room}`);
  //   // Emit a message to all sockets in the room except the sender
  //   io.to(room).emit("user-joined", `Socket ${id} has joined room ${room}`);
  // });
  socket.on("join_chat",(room)=>{
    socket.join(room);
     // Emit a message to all sockets in the room except the sender
     io.to(room).emit("user-joined", `Socket ${socket.id} has joined room ${room}`);
    console.log("socket join room",room);
})



//   main();

  // Send chat history to the new user
  Message.find().sort({ timestamp: -1 }).exec((err, messages) => {
    if (err) return console.error('Error fetching chat history:', err);
    socket.emit('chat history', messages.reverse());
  });

  // Receive and broadcast messages
  socket.on('chat message', async(msg) => {
    // const newMessage = new Message(msg);
    //  newMessage.save((err, savedMessage) => {
    //   if (err) return console.error('Error saving message:', err);
    //   console.log('Message saved successfully:', savedMessage);
      
    //   // socket.broadcast.emit('chat message', savedMessage);
    //   // socket.emit('chat message r', savedMessage)
    //   // emitter.emit('chat message', savedMessage);
    // });

    const newMessage = new Message(msg);
    await newMessage.save((err, savedMessage) => {
     if (err) return console.error('Error saving message:', err);
     console.log('Message saved successfully:', savedMessage);
     
     // socket.broadcast.emit('chat message', savedMessage);
     // socket.emit('chat message r', savedMessage)
    //  emitter.emit('chat message', msg);
   });
   // io.to(msg.groupName).emit('chat message r', msg);
   emitter.emit('chat message', msg);
    // io.to(msg.groupName).emit('chat message r', msg);
    // emitter.emit('chat message', msg);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    // emitter.socketsLeave();
    console.log('User disconnected');
  });
});




// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});