const { Server } = require("socket.io");
const moment = require("moment");
let io;

const rooms = {}; // Store rooms with roomId as key and room details as value

module.exports = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: "*", // Change this if you want to restrict access
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      // console.log("New client connected:", socket.id);

      socket.on("joinChallenge", ({ roomId }) => {
        socket.join(roomId); // Now joining the room
        // console.log(`User with ID ${socket.id} joined room ${roomId}`);
    
        // Notify other room members of the new player
        io.to(roomId).emit("playerJoined", { userId: socket.id });
      });
      
      
      socket.on("getRoomDetails", (roomId) => {
        const roomDetails = rooms[roomId];
        if (roomDetails) {
          socket.emit("roomDetails", { success: true, room: roomDetails });
        } else {
          socket.emit("roomDetails", { success: false, message: "Room not found." });
        }
      });

      socket.on("acceptChallenge", (data) => {
        const { roomId, playerId } = data;
        if (rooms[roomId]) {
          rooms[roomId].membersAccepted.push(playerId); // Add player ID to membersAccepted
          // Notify other users in the room
          io.to(roomId).emit("memberAccepted", { playerId });
        }
      });
      

      // Event for leaving a room
      socket.on("leaveRoom", ({ roomId, playerId }) => {
        if (rooms[roomId]) {
          socket.leave(roomId);
          rooms[roomId].players = rooms[roomId].players.filter(
            (id) => id !== playerId
          );
          io.to(roomId).emit("playerLeft", { playerId });
          socket.emit("leaveSuccess", { message: "You have left the room." });
        }
      });

      // Event for disconnecting
      socket.on("disconnect", () => {
        // console.log("Client disconnected:", socket.id);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },

  createChallengeRoom: (
    roomId,
    creatorRole,
    teamName,
    players,
    creatorId,
    allowedMembers,
    // membersAccepted,
    challengeDate,
    maxAccepts
  ) => {
    rooms[roomId] = {
      creatorRole,
      teamName,
      creatorId,
      allowedMembers,
      players, // Players currently in the room
      membersAccepted: [],
      challengeDate: moment(challengeDate).format("YYYY-MM-DD"), // Store challenge date
      maxAccepts, // Maximum number of players allowed to join
    };

    io.to(roomId).emit("roomCreated", { roomId, creatorRole, challengeDate,teamName });
  },

  getRooms: () => rooms

};
