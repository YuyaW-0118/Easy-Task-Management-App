const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_secret_key';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    const sql = fs.readFileSync(path.join(__dirname, 'sql', 'create_users_and_tasks_tables.sql'), 'utf8');
    db.exec(sql, (err) => {
        if (err) {
            console.error("Error executing SQL script:", err);
        } else {
            console.log("Database initialized successfully");
        }
    });
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pic', express.static(path.join(__dirname, 'pic')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ユーザー登録
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.run(query, [username, hashedPassword], function(err) {
        if (err) return res.status(500).send("Error registering user");
        res.status(200).send({ success: true, message: "User registered successfully" });
    });
});

// ユーザーログイン
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ?";
    db.get(query, [username], (err, user) => {
        if (err) return res.status(500).send("Error on the server.");
        if (!user) return res.status(404).send("No user found.");

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null, message: "Password is incorrect." });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: 86400 });
        res.status(200).send({ auth: true, token: token });
    });
});

app.get('/tasks', verifyToken, (req, res) => {
    const userId = req.userId;

    const query = "SELECT * FROM tasks WHERE user_id = ?";
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).send("Error retrieving tasks");
        res.status(200).send(rows);
    });
});

// タスクの追加
app.post('/task', verifyToken, (req, res) => {
    const { task, priority } = req.body;
    const userId = req.userId;

    const query = "INSERT INTO tasks (user_id, task, priority) VALUES (?, ?, ?)";
    db.run(query, [userId, task, priority], function(err) {
        if (err) return res.status(500).send("Error adding task");
        res.status(200).send({ success: true, message: "Task added successfully" });
    });
});

// ユーザー認証
function verifyToken(req, res, next) {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(403).send({ auth: false, message: "No token provided." });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).send({ auth: false, message: "Failed to authenticate token." });
        req.userId = decoded.id;
        next();
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
