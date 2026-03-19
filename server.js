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

const ExcelJS = require('exceljs');

app.get('/api/export', async (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        const preprodTasks = data.phases.preprod.current.tasks;

        const DEPARTMENTS = {
            'rh': '🏢 Ressources Humaines',
            'compta': '💰 Comptabilité_Finances',
            'achat_stock': '📦 Achat et Stock',
            'achats': '📦 Achat et Stock',
            'stock': '📦 Achat et Stock',
            'logistique': '🚚 Logistique'
        };

        const workbook = new ExcelJS.Workbook();
        
        // Group tasks by department
        const groups = {};
        preprodTasks.forEach(t => {
            const dId = t.deptId || 'inconnu';
            if (!groups[dId]) groups[dId] = [];
            groups[dId].push(t);
        });

        // Create a worksheet for each department group
        Object.keys(groups).forEach(deptId => {
            const deptLabel = DEPARTMENTS[deptId] || deptId;
            // Clean sheet name (max 31 chars, no special shell chars)
            const sheetName = deptLabel.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
            const sheet = workbook.addWorksheet(sheetName);

            sheet.columns = [
                { header: 'Tâche / Processus Digitalisable', key: 'task', width: 50 },
                { header: 'Progression (%)', key: 'preprod', width: 18 },
                { header: 'État', key: 'status', width: 22 },
                { header: 'Utilisation (Production)', key: 'isDeployed', width: 25 }
            ];

            // Style Header
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            groups[deptId].forEach(task => {
                const progress = task.progress || 0;
                const row = sheet.addRow({
                    task: task.name,
                    preprod: progress / 100,
                    status: progress === 100 ? '✅ Terminée' : (progress > 0 ? '⏳ En cours' : '❌ À faire'),
                    isDeployed: task.isDeployed ? '🚀 Déployée ✅' : '🛠️ En Dev'
                });

                row.getCell('preprod').numFmt = '0%';
                
                const statusCell = row.getCell('status');
                if (progress === 100) statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };
                else if (progress === 0) statusCell.font = { color: { argb: 'FFC0392B' } };
                else statusCell.font = { color: { argb: 'FFF39C12' } };

                const deployCell = row.getCell('isDeployed');
                if (task.isDeployed) deployCell.font = { color: { argb: 'FF2980B9' }, bold: true };

                row.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Base_de_Donnees_Par_Equipe.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

        await workbook.xlsx.write(res);
        res.end();

    } catch (e) {
        console.error('Export Error:', e);
        res.status(500).send('Error generating export');
    }
});

app.get('/api/export-deployed', async (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        const preprodTasks = data.phases.preprod.current.tasks.filter(t => t.isDeployed);

        const DEPARTMENTS = {
            'rh': '🏢 Ressources Humaines',
            'compta': '💰 Comptabilité_Finances',
            'achat_stock': '📦 Achat et Stock',
            'achats': '📦 Achat et Stock',
            'stock': '📦 Achat et Stock',
            'logistique': '🚚 Logistique'
        };

        const workbook = new ExcelJS.Workbook();
        
        // Grouping
        const groups = {};
        preprodTasks.forEach(t => {
            const dId = t.deptId || 'inconnu';
            if (!groups[dId]) groups[dId] = [];
            groups[dId].push(t);
        });

        Object.keys(groups).forEach(deptId => {
            const deptLabel = DEPARTMENTS[deptId] || deptId;
            const sheetName = deptLabel.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
            const sheet = workbook.addWorksheet(sheetName);

            sheet.columns = [
                { header: 'Tâche Actuelle (Prod)', key: 'task', width: 50 },
                { header: 'Progression (%)', key: 'preprod', width: 18 },
                { header: 'Statut Déploiement', key: 'status', width: 25 }
            ];

            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A085' } }; 
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            groups[deptId].forEach(task => {
                const row = sheet.addRow({
                    task: task.name,
                    preprod: (task.progress || 0) / 100,
                    status: '🚀 En Production'
                });

                row.getCell('preprod').numFmt = '0%';
                const statusCell = row.getCell('status');
                statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };

                row.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });
        });

        if (Object.keys(groups).length === 0) {
            const sheet = workbook.addWorksheet('Vide');
            sheet.addRow(["Aucune tâche n'est actuellement marquée comme déployée"]);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Rapport_Taches_Deployees_Par_Equipe.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

    } catch (e) {
        console.error('Deployed Export Error:', e);
        res.status(500).send('Error generating export');
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
