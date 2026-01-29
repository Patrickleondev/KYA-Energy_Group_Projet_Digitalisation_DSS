const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 80;
const DATA_FILE = path.join(__dirname, 'data.json');
const FEEDBACK_FILE = path.join(__dirname, 'feedback.json');

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Default initial data (if no file exists)
const initialData = {
    history: [],
    current: {
        dateRange: { start: '', end: '' },
        tasks: [
            { id: 1, deptId: 'rh', name: 'Recrutement digital', progress: 0 },
            { id: 2, deptId: 'rh', name: 'Gestion des congés', progress: 0 },
            { id: 3, deptId: 'compta', name: 'Facturation électronique', progress: 0 },
            { id: 4, deptId: 'achats', name: 'Portail fournisseurs', progress: 0 },
            { id: 5, deptId: 'stock', name: 'Suivi temps réel', progress: 0 },
        ]
    }
};

// Initialize data.json if it doesn't exist
// Initialize data.json if it doesn't exist
const INITIAL_DATA_FILE = path.join(__dirname, 'initial_data.json');

if (!fs.existsSync(DATA_FILE)) {
    if (fs.existsSync(INITIAL_DATA_FILE)) {
        // Restore from seed file (committed data)
        fs.copyFileSync(INITIAL_DATA_FILE, DATA_FILE);
        console.log("Restored data from initial_data.json");
    } else {
        // Fallback to empty structure
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log("Created new data.json from default template");
    }
}

app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Error reading data file" });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: "JSON parse error" });
        }
    });
});

app.post('/api/data', (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
        if (err) return res.status(500).json({ error: "Error saving data file" });
        res.json({ message: "Data saved successfully" });
    });
});

app.post('/api/feedback', (req, res) => {
    const feedback = req.body;
    feedback.timestamp = new Date().toISOString();

    fs.readFile(FEEDBACK_FILE, 'utf8', (err, data) => {
        let feedbacks = [];
        if (!err && data) {
            try { feedbacks = JSON.parse(data); } catch (e) { }
        }
        feedbacks.push(feedback);

        fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), (err) => {
            if (err) return res.status(500).json({ error: "Error saving feedback" });
            res.json({ message: "Feedback saved" });
        });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
