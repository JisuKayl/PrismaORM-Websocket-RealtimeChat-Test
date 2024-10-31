import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [animals, setAnimals] = useState([]);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/animals")
      .then((response) => {
        setAnimals(response.data);
      })
      .catch((error) => {
        console.error("Error fetching animals:", error);
      });
  }, []);

  const handleAddAnimal = (e) => {
    e.preventDefault();
    if (!name || !species) return;

    axios
      .post("http://localhost:3000/api/animals", { name, species })
      .then((response) => {
        setAnimals((prevAnimals) => [...prevAnimals, response.data]);
        setName("");
        setSpecies("");
      })
      .catch((error) => {
        console.error("Error adding animal:", error);
      });
  };

  const handleJoin = () => {
    if (!username) return;

    socket.current = new WebSocket("ws://localhost:3000");

    socket.current.onopen = () => {
      socket.current.send(JSON.stringify({ type: "join", username }));
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
        JSON.stringify({ type: "message", username, text: message })
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
      <div className="animal-section">
        <h2>Animal Management</h2>
        <form onSubmit={handleAddAnimal} className="animal-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Animal Name"
            required
          />
          <input
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Species"
            required
          />
          <button type="submit">Add Animal</button>
        </form>
        <ul>
          {animals.map((animal) => (
            <li key={animal.id}>
              {animal.name} - {animal.species}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-section">
        <h2>WebSocket Chat</h2>
        {!connected ? (
          <div className="join-section">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              required
            />
            <button onClick={handleJoin}>Join Chat</button>
          </div>
        ) : (
          <>
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
                    style={
                      msg.notification
                        ? { textAlign: "center", color: "gray" }
                        : {}
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
          </>
        )}
      </div>
    </div>
  );
}

export default App;
