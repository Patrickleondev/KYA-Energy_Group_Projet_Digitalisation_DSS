const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA_FILE = path.join(__dirname, 'data.json');
const EXPORT_FILE = path.join(__dirname, 'Rapport_Stage_Taches.xlsx');

const DEPARTMENTS = {
    'rh': 'Ressources Humaines',
    'compta': 'Comptabilité/Finances',
    'achat_stock': 'Achat et Stock',
    'achats': 'Achat et Stock',
    'stock': 'Achat et Stock',
    'logistique': 'Logistique'
};

const createExcel = async () => {
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

        // Create Workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Suivi Digitalisation');

        // Define Columns
        sheet.columns = [
            { header: 'Département', key: 'dept', width: 25 },
            { header: 'Tâche / Processus', key: 'task', width: 40 },
            { header: 'Test (%)', key: 'test', width: 15 },
            { header: 'Pré-Prod (%)', key: 'preprod', width: 15 },
            { header: 'État', key: 'status', width: 20 }
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2C3E50' }
        };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Data
        Object.values(taskMap).forEach(task => {
            const row = sheet.addRow({
                dept: DEPARTMENTS[task.deptId] || task.deptId,
                task: task.name,
                test: task.test / 100,
                preprod: task.preprod / 100,
                status: task.preprod === 100 ? 'Terminé' : (task.preprod > 0 ? 'En cours' : 'À faire')
            });

            // Format Percentages
            row.getCell('test').numFmt = '0%';
            row.getCell('preprod').numFmt = '0%';

            // Colorize Status
            const statusCell = row.getCell('status');
            if (task.preprod === 100) {
                statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };
            } else if (task.preprod === 0) {
                statusCell.font = { color: { argb: 'FFC0392B' } };
            } else {
                statusCell.font = { color: { argb: 'FFF39C12' } };
            }

            // Alternating Row Colors (optional, but clean)
            if (sheet.rowCount % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F2F2' }
                };
            }

            // Borders
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Write File
        await workbook.xlsx.writeFile(EXPORT_FILE);
        console.log(`Excel file created: ${EXPORT_FILE}`);

    } catch (e) {
        console.error('Error generating Excel:', e);
    }
};

createExcel();
