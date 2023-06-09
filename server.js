// the express package will run our server
const express = require("express");
const app = express();
const PORT = 8000
app.use(express.static("public")); // this line tells the express app to 'serve' the public folder to clients

// HTTP will expose our server to the web
const http = require("http").createServer(app);

// start our server listening on port 8080 for now (this is standard for HTTP connections)
const server = app.listen(PORT);

/////SOCKET.IO///////
const io = require("socket.io")().listen(server);

console.log("Server is running on http://localhost:8000");

const peers = {};

io.on("connection", (socket) => {
  console.log(
    "Someone joined our server using socket.io.  Their socket id is",
    socket.id
  );
  socket.emit('exsisting', peers)
  //peers[socket.id] = {};

  console.log("Current peers:", peers);

  socket.on('addUser', data => {
    console.log('server addUser')
    peers[socket.id] = data
    socket.broadcast.emit('addUser', data)
  })
  socket.on('updateUserPosition', data => {
    //console.log('updateUserPosition', data)
    
    peers[data.id] = data

    socket.broadcast.emit('updateUserPosition', data)
  })

  socket.on("disconnect", () => {
    console.log("Someone with ID", socket.id, "left the server");
    delete peers[socket.id];
    socket.broadcast.emit('removeUser', { id: socket.id })
  });
});
