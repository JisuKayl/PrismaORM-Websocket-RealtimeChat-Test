const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const http = require("http");
const WebSocket = require("ws");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

require("dotenv").config();
const port = process.env.port;

const routes = require("./src/routes/index");

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(routes);

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const parsedData = JSON.parse(data);

    if (parsedData.type === "join") {
      ws.username = parsedData.username;

      const joinMessage = JSON.stringify({
        type: "notification",
        text: `${ws.username} has joined the chat`,
      });
      broadcast(joinMessage, ws);
    } else {
      const outgoingMessage = JSON.stringify({
        type: "message",
        username: ws.username || "Anonymous",
        text: parsedData.text,
      });
      broadcast(outgoingMessage);
    }
  });

  ws.on("close", () => {
    if (ws.username) {
      const disconnectMessage = JSON.stringify({
        type: "notification",
        text: `${ws.username} has disconnected`,
      });
      broadcast(disconnectMessage, ws);
    }
  });
});

function broadcast(data, excludeClient = null) {
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

app.get("/api/animals", async (req, res) => {
  try {
    const animals = await prisma.animal.findMany();
    res.json(animals);
  } catch (err) {
    console.error("Error retrieving animals:", err);
    res.status(500).json({ error: "Database query error" });
  }
});

app.post("/api/animals", async (req, res) => {
  const { name, species } = req.body;
  try {
    const newAnimal = await prisma.animal.create({
      data: {
        name,
        species,
      },
    });
    res.status(201).json(newAnimal);
  } catch (err) {
    console.error("Error creating animal:", err);
    res.status(500).json({ error: "Database insert error" });
  }
});

app.get("/", (req, res) => {
  res.send("Test");
});

server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
