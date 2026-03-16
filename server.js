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
        const testTasks = data.phases.test.current.tasks;
        const preprodTasks = data.phases.preprod.current.tasks;

        // Map Tasks
        const taskMap = {};
        const processTask = (t, phase) => {
            if (!taskMap[t.id]) {
                taskMap[t.id] = {
                    id: t.id,
                    name: t.name,
                    deptId: t.deptId,
                    test: 0,
                    preprod: 0
                };
            }
            taskMap[t.id][phase] = t.progress;
        };

        testTasks.forEach(t => processTask(t, 'test'));
        preprodTasks.forEach(t => processTask(t, 'preprod'));

        const DEPARTMENTS = {
            'rh': 'Ressources Humaines',
            'compta': 'Comptabilité/Finances',
            'achat_stock': 'Achat et Stock',
            'achats': 'Achat et Stock',
            'stock': 'Achat et Stock',
            'logistique': 'Logistique'
        };

        // Create Workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Suivi Digitalisation');

        sheet.columns = [
            { header: 'Département', key: 'dept', width: 25 },
            { header: 'Tâche / Processus', key: 'task', width: 40 },
            { header: 'Test (%)', key: 'test', width: 15 },
            { header: 'Pré-Prod (%)', key: 'preprod', width: 15 },
            { header: 'État', key: 'status', width: 20 }
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        Object.values(taskMap).forEach(task => {
            const row = sheet.addRow({
                dept: DEPARTMENTS[task.deptId] || task.deptId,
                task: task.name,
                test: task.test / 100,
                preprod: task.preprod / 100,
                status: task.preprod === 100 ? 'Terminé' : (task.preprod > 0 ? 'En cours' : 'À faire')
            });

            row.getCell('test').numFmt = '0%';
            row.getCell('preprod').numFmt = '0%';

            const statusCell = row.getCell('status');
            if (task.preprod === 100) statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };
            else if (task.preprod === 0) statusCell.font = { color: { argb: 'FFC0392B' } };
            else statusCell.font = { color: { argb: 'FFF39C12' } };

            row.eachCell((cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Base_de_Donnees_Complete.xlsx"');

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
        
        // Filter only deployed tasks
        const testTasks = data.phases.test.current.tasks.filter(t => t.isDeployed);
        const preprodTasks = data.phases.preprod.current.tasks.filter(t => t.isDeployed);

        // Map Tasks
        const taskMap = {};
        const processTask = (t, phase) => {
            if (!taskMap[t.id]) {
                taskMap[t.id] = {
                    id: t.id,
                    name: t.name,
                    deptId: t.deptId,
                    test: 0,
                    preprod: 0,
                    isDeployed: t.isDeployed
                };
            }
            taskMap[t.id][phase] = t.progress;
        };

        testTasks.forEach(t => processTask(t, 'test'));
        preprodTasks.forEach(t => processTask(t, 'preprod'));

        const DEPARTMENTS = {
            'rh': 'Ressources Humaines',
            'compta': 'Comptabilité/Finances',
            'achat_stock': 'Achat et Stock',
            'achats': 'Achat et Stock',
            'stock': 'Achat et Stock',
            'logistique': 'Logistique'
        };

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tâches Déployées');

        sheet.columns = [
            { header: 'Département', key: 'dept', width: 25 },
            { header: 'Tâche Actuelle (Prod)', key: 'task', width: 40 },
            { header: 'Pré-Prod (%)', key: 'preprod', width: 15 },
            { header: 'Statut Déploiement', key: 'status', width: 25 }
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A085' } }; // Green theme for deployed
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        Object.values(taskMap).forEach(task => {
            const row = sheet.addRow({
                dept: DEPARTMENTS[task.deptId] || task.deptId,
                task: task.name,
                preprod: task.preprod / 100,
                status: 'En Production 🚀'
            });

            row.getCell('preprod').numFmt = '0%';
            const statusCell = row.getCell('status');
            statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };

            row.eachCell((cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        if (Object.keys(taskMap).length === 0) {
            sheet.addRow({
                dept: '-',
                task: "Aucune tâche n'est actuellement marquée comme déployée",
                preprod: 0,
                status: '-'
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Rapport_Taches_Deployees.xlsx"');

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
