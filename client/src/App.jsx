import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [users, setUsers] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/users");
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !username || !password) return;

    try {
      const response = await axios.post("http://localhost:3000/api/register", {
        firstName,
        lastName,
        email,
        username,
        password,
      });
      setUsers((prevUsers) => [...prevUsers, response.data]);
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) return;

    try {
      const response = await axios.post("http://localhost:3000/api/login", {
        identifier: loginIdentifier,
        password: loginPassword,
      });

      if (response.data.success && response.data.user) {
        setLoggedInUsername(response.data.user.username);
        handleJoin(response.data.user.username);
      } else {
        console.error("Login failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const handleJoin = (username) => {
    if (!username) return;

    socket.current = new WebSocket("ws://localhost:3000");

    socket.current.onopen = () => {
      socket.current.send(JSON.stringify({ type: "join", username: username }));
      setConnected(true);
      setMessages((prev) => [
        ...prev,
        {
          username: "You",
          text: "You have joined the chat",
          notification: true,
        },
      ]);
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.username === username) return;

      if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
      } else if (data.type === "notification") {
        setMessages((prev) => [
          ...prev,
          { text: data.text, notification: true },
        ]);
      }
    };

    socket.current.onclose = () => {
      setConnected(false);
      setMessages((prev) => {
        if (username !== "You") {
          return [
            ...prev,
            { text: `${username} has disconnected`, notification: true },
          ];
        }
        return prev;
      });
    };
  };

  const handleSendMessage = () => {
    if (message && socket.current) {
      socket.current.send(
        JSON.stringify({
          type: "message",
          username: loggedInUsername,
          text: message,
        })
      );
      setMessages((prev) => [...prev, { username: "You", text: message }]);
      setMessage("");
    }
  };

  const handleLeave = () => {
    if (socket.current) {
      socket.current.close();
      setConnected(false);
      setMessages((prev) => {
        if (
          prev.length > 0 &&
          prev[prev.length - 1].text === "You have disconnected" &&
          prev[prev.length - 1].username === "You"
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            username: "You",
            text: "You have disconnected",
            notification: true,
          },
        ];
      });
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="user-section">
          <h2>User Management</h2>
          <form onSubmit={handleAddUser} className="user-form">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              required
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit">Add User</button>
          </form>
          {users.length === 0 ? (
            <p>No user data yet.</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Username</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="chat-section">
          <h2>WebSocket Chat</h2>
          {!connected ? (
            <div className="join-section">
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                required
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button onClick={handleLogin}>Join Chat</button>
            </div>
          ) : (
            <div className="chat-container">
              <div className="chat-header">Welcome to the chat!</div>
              <div className="chat-box">
                <div className="messages">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={
                        msg.notification
                          ? "notification"
                          : msg.username === "You"
                          ? "message sent"
                          : "message received"
                      }
                    >
                      {msg.notification
                        ? msg.text
                        : `${msg.username}: ${msg.text}`}
                    </div>
                  ))}
                </div>
                <div className="input-section">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    required
                  />
                  <button onClick={handleSendMessage}>Send</button>
                </div>
                <button className="leave-button" onClick={handleLeave}>
                  Leave Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
