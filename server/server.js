const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const http = require("http");
const WebSocket = require("ws");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

require("dotenv").config();
const port = process.env.PORT || 3000;

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
  let isJoined = false; // Track if user has joined the chat

  ws.on("message", (data) => {
    const parsedData = JSON.parse(data);

    if (parsedData.type === "join") {
      ws.username = parsedData.username;

      // If user is joining for the first time in this session
      if (!isJoined) {
        isJoined = true; // Mark user as joined

        const joinMessage = JSON.stringify({
          type: "notification",
          text: `${ws.username} has joined the chat`,
        });
        broadcast(joinMessage, ws);
      } else {
        // Send a notification that user has rejoined
        const rejoinMessage = JSON.stringify({
          type: "notification",
          text: `${ws.username} has rejoined the chat`,
        });
        broadcast(rejoinMessage, ws);
      }
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

app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
      },
    });
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Database insert error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Database fetch error" });
  }
});

app.get("/", (req, res) => {
  res.send("Test");
});

server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
