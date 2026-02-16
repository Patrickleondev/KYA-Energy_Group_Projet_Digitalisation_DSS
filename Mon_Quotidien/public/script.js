let dashboardData = {};

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    fetchData();
});

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById('currentDate').innerText = today.toLocaleDateString('fr-FR', options);
}

async function fetchData() {
    try {
        const response = await fetch('/api/tasks');
        dashboardData = await response.json();
        renderDashboard();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderDashboard() {
    renderRoutine();
    renderGoals();
    renderVictories();
}

function renderRoutine() {
    const list = document.getElementById('routineList');
    list.innerHTML = '';
    dashboardData.dailyRoutine.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `task-item ${item.status === 'completed' ? 'completed' : ''}`;
        div.innerHTML = `
            <div class="check-mark" onclick="event.stopPropagation(); toggleRoutine(${index})"></div>
            <div class="time-box">${item.time}</div>
            <div class="task-label">${item.label}</div>
            <div class="task-actions">
                <button class="btn-icon delete-btn" onclick="event.stopPropagation(); deleteTask(${index})">×</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderGoals() {
    renderGoalGroup('erpnextGoals', dashboardData.goals.erpnext);
    renderGoalGroup('cyberGoals', dashboardData.goals.cyber);
}

function renderGoalGroup(elementId, goals) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    goals.forEach((goal) => {
        const div = document.createElement('div');
        div.className = 'goal-item';
        div.onclick = () => openGoalModal(goal.id);
        div.innerHTML = `
            <div class="goal-header">
                <span>${goal.name}</span>
                <span>${goal.progress}%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${goal.progress}%; background: ${goal.color}"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderVictories() {
    const feed = document.getElementById('victoryFeed');
    if (dashboardData.victories.length === 0) {
        feed.innerHTML = '<p class="empty-state">Accomplissez vos objectifs pour célébrer vos victoires.</p>';
        return;
    }
    feed.innerHTML = '';
    dashboardData.victories.slice(-10).reverse().forEach(v => {
        const div = document.createElement('div');
        div.className = 'victory-item';
        div.innerHTML = `<strong>${v.title}</strong><br><small>${v.time}</small>`;
        feed.appendChild(div);
    });
}

async function toggleRoutine(index) {
    const item = dashboardData.dailyRoutine[index];
    const prevStatus = item.status;
    item.status = item.status === 'completed' ? 'pending' : 'completed';

    if (item.status === 'completed' && prevStatus !== 'completed') {
        addVictory(`Routine complétée: ${item.label}`);
        triggerVictoryEffect();
    }

    await saveData();
    renderDashboard();
}

async function deleteTask(index) {
    if (confirm("Supprimer cette tâche ?")) {
        dashboardData.dailyRoutine.splice(index, 1);
        await saveData();
        renderDashboard();
    }
}

async function clearVictories() {
    if (confirm("Effacer tout l'historique des victoires ?")) {
        dashboardData.victories = [];
        await saveData();
        renderDashboard();
    }
}

function addVictory(title) {
    dashboardData.victories.push({
        title: title,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
}

async function saveData() {
    await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboardData)
    });
}

// Modal Logic
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function openAddTaskModal() {
    const body = document.getElementById('modalBody');
    document.getElementById('modalTitle').innerText = "Nouvelle Tâche";
    body.innerHTML = `
        <input type="text" id="taskTime" placeholder="Ex: 08:30 - 09:00">
        <input type="text" id="taskLabel" placeholder="Nom de la tâche">
        <select id="taskCategory">
            <option value="deep-work">Deep Work</option>
            <option value="lab">Lab / Study</option>
            <option value="social">Social / Meeting</option>
            <option value="elite">Elite Session</option>
        </select>
    `;
    const btn = document.getElementById('modalActionBtn');
    btn.innerText = "Ajouter";
    btn.onclick = addNewTask;
    document.getElementById('modal').style.display = 'flex';
}

async function addNewTask() {
    const time = document.getElementById('taskTime').value;
    const label = document.getElementById('taskLabel').value;
    const category = document.getElementById('taskCategory').value;

    if (!time || !label) return alert("Veuillez remplir tous les champs");

    dashboardData.dailyRoutine.push({
        time, label, category, status: 'pending'
    });

    await saveData();
    renderDashboard();
    closeModal();
}

function openGoalModal(goalId) {
    const goal = [...dashboardData.goals.erpnext, ...dashboardData.goals.cyber].find(g => g.id === goalId);
    const body = document.getElementById('modalBody');
    document.getElementById('modalTitle').innerText = `Éditer ${goal.name}`;
    body.innerHTML = `
        <label>Progression: <span id="progressVal">${goal.progress}%</span></label>
        <input type="range" id="goalProgress" min="0" max="100" value="${goal.progress}">
    `;

    document.getElementById('goalProgress').oninput = function () {
        document.getElementById('progressVal').innerText = `${this.value}%`;
    };

    const btn = document.getElementById('modalActionBtn');
    btn.innerText = "Mettre à jour";
    btn.onclick = () => updateGoalProgress(goalId);
    document.getElementById('modal').style.display = 'flex';
}

async function updateGoalProgress(goalId) {
    const newValue = parseInt(document.getElementById('goalProgress').value);
    const goal = [...dashboardData.goals.erpnext, ...dashboardData.goals.cyber].find(g => g.id === goalId);

    if (newValue === 100 && goal.progress < 100) {
        addVictory(`Objectif atteint: ${goal.name} 🎯`);
        triggerVictoryEffect();
    }

    goal.progress = newValue;
    await saveData();
    renderDashboard();
    closeModal();
}

function triggerVictoryEffect() {
    const body = document.body;
    body.style.transition = 'box-shadow 0.3s';
    body.style.boxShadow = 'inset 0 0 100px rgba(56, 189, 248, 0.4)';
    setTimeout(() => {
        body.style.boxShadow = 'none';
    }, 400);
}
