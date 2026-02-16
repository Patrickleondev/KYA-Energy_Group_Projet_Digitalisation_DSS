const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize tasks.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    const initialTasks = {
        dailyRoutine: [
            { time: "08:00 - 08:30", label: "Planification", category: "deep-work", status: "pending" },
            { time: "08:30 - 11:30", label: "Immersion Totale ERPNext", category: "deep-work", status: "pending" },
            { time: "11:30 - 13:00", label: "Le Pont Technique (Docker/THM)", category: "lab", status: "pending" },
            { time: "14:00 - 16:00", label: "Social & Suivi (Stage)", category: "social", status: "pending" },
            { time: "16:00 - 17:00", label: "Documentation", category: "deep-work", status: "pending" },
            { time: "18:30 - 20:00", label: "HTB AI Red Teamer", category: "elite", status: "pending" }
        ],
        goals: {
            erpnext: [
                { id: "rh", name: "RH", progress: 0, color: "#ff4d4d" },
                { id: "stock", name: "Stock/Logistique", progress: 0, color: "#ffa500" },
                { id: "compta", name: "Comptabilité", progress: 0, color: "#4caf50" }
            ],
            cyber: [
                { id: "thm", name: "TryHackMe", progress: 10, color: "#00bcd4" },
                { id: "htb", name: "HackTheBox", progress: 5, color: "#9c27b0" },
                { id: "docker", name: "Docker (OC)", progress: 20, color: "#2196f3" }
            ]
        },
        victories: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialTasks, null, 2));
}

app.get('/api/tasks', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send("Error reading data");
        res.json(JSON.parse(data));
    });
});

app.post('/api/tasks', (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
        if (err) return res.status(500).send("Error saving data");
        res.json({ message: "Success" });
    });
});

app.listen(PORT, () => {
    console.log(`Daily Architect running on http://localhost:${PORT}`);
});
