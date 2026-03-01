// Firebase Compat is loaded globally via HTML

// ==========================================
// CONFIGURAÇÃO DO FIREBASE (SUBSTITUA AQUI!)
// ==========================================
// Vá no Console do Firebase > Configurações do Projeto
// e copie e cole o objeto abaixo:
const firebaseConfig = {
    apiKey: "AIzaSyAfEZwf59sXahQ7G9BpxhH0HHpXUlZyTTg",
    authDomain: "sistemaescolar-4e705.firebaseapp.com",
    databaseURL: "https://sistemaescolar-4e705-default-rtdb.firebaseio.com",
    projectId: "sistemaescolar-4e705",
    storageBucket: "sistemaescolar-4e705.firebasestorage.app",
    messagingSenderId: "451255528962",
    appId: "1:451255528962:web:7080edb8f4c01ec51bc11b",
    measurementId: "G-9HGBYTBN86"
};

// Inicializar Firebase
let app, db, auth;
let useMockData = false;

try {
    if (!firebaseConfig.apiKey) throw new Error("Configuração pendente");
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    auth = firebase.auth();
} catch (e) {
    console.warn("Firebase não configurado ou erro. Usando dados locais (mock) para demonstração.");
    useMockData = true;
}

// Estado Local (Mock) - Dados iniciais pre-carregados se não houver Firebase
let mockData = {
    activities: {
        "act1": { title: "Trabalho de História", createdAt: Date.now() },
        "act2": { title: "Apresentação de Ciências", createdAt: Date.now() }
    },
    students: {
        "stu1": { name: "João Silva", completedActs: { "act1": true } },
        "stu2": { name: "Maria Oliveira", completedActs: { "act1": true, "act2": true } },
        "stu3": { name: "Carlos Mendes", completedActs: {} }
    }
};

let currentActivities = {};
let currentStudents = {};

// Função para iniciar e escutar o DB em tempo real
function initDatabaseListeners() {
    if (useMockData) {
        updateLocalState(mockData);
        return;
    }

    const dbRef = db.ref('/');
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val() || { activities: {}, students: {} };
        updateLocalState(data);
    });
}

function updateLocalState(data) {
    currentActivities = data.activities || {};
    currentStudents = data.students || {};

    renderTeacherView();
    renderStudentSelector();

    if (currentLoggedInStudentId) {
        renderStudentDashboard(currentLoggedInStudentId);
    }
}

// ==========================================
// LÓGICA DO PROFESSOR
// ==========================================
document.getElementById('addActivityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('activityName').value.trim();
    if (!title) return;

    const newActId = 'act_' + Date.now();
    const activityData = { title, createdAt: Date.now() };

    if (useMockData) {
        mockData.activities[newActId] = activityData;
        updateLocalState(mockData);
    } else {
        db.ref('activities/' + newActId).set(activityData);
    }

    document.getElementById('activityName').value = '';
});

document.getElementById('addStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newStudentName').value.trim();
    if (!name) return;

    const newStuId = 'stu_' + Date.now();
    const studentData = { name, completedActs: {} };

    if (useMockData) {
        mockData.students[newStuId] = studentData;
        updateLocalState(mockData);
    } else {
        db.ref('students/' + newStuId).set(studentData);
    }

    document.getElementById('newStudentName').value = '';
    closeAddStudentModal();
});

function toggleActivityCompletion(studentId, activityId, isCompleted) {
    if (useMockData) {
        if (!mockData.students[studentId].completedActs) mockData.students[studentId].completedActs = {};
        if (isCompleted) {
            mockData.students[studentId].completedActs[activityId] = true;
        } else {
            delete mockData.students[studentId].completedActs[activityId];
        }
        updateLocalState(mockData);
    } else {
        const updates = {};
        if (isCompleted) {
            updates['students/' + studentId + '/completedActs/' + activityId] = true;
        } else {
            updates['students/' + studentId + '/completedActs/' + activityId] = null;
        }
        db.ref().update(updates);
    }
}

function removeActivity(activityId) {
    if (typeof openRemoveActivityModal === 'function') {
        openRemoveActivityModal(activityId);
    }
}

// Lidar com envio do formulário de exclusão de atividade
document.getElementById('removeActivityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const activityId = document.getElementById('removeActivityId').value;
    if (!activityId) return;

    if (useMockData) {
        delete mockData.activities[activityId];
        for (let stu in mockData.students) {
            if (mockData.students[stu].completedActs && mockData.students[stu].completedActs[activityId]) {
                delete mockData.students[stu].completedActs[activityId];
            }
        }
        updateLocalState(mockData);
    } else {
        db.ref('activities/' + activityId).remove();
        const updates = {};
        for (let stu in currentStudents) {
            if (currentStudents[stu].completedActs && currentStudents[stu].completedActs[activityId]) {
                updates['students/' + stu + '/completedActs/' + activityId] = null;
            }
        }
        if (Object.keys(updates).length > 0) db.ref().update(updates);
    }

    if (typeof closeRemoveActivityModal === 'function') {
        closeRemoveActivityModal();
    }
});

function renameActivity(activityId) {
    const act = currentActivities[activityId];
    if (!act) return;

    // Agora chama a função do escopo global (definida no HTML) para abrir o modal
    if (typeof openRenameActivityModal === 'function') {
        openRenameActivityModal(activityId, act.title);
    }
}

// Lidar com envio do formulário de renomeação de atividade
document.getElementById('renameActivityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const activityId = document.getElementById('renameActivityId').value;
    const newName = document.getElementById('renameActivityName').value.trim();

    if (!activityId || !newName) return;

    if (useMockData) {
        if (mockData.activities[activityId]) {
            mockData.activities[activityId].title = newName;
            updateLocalState(mockData);
        }
    } else {
        db.ref('activities/' + activityId + '/title').set(newName);
    }

    if (typeof closeRenameActivityModal === 'function') {
        closeRenameActivityModal();
    }
});

function removeStudent(studentId) {
    const student = currentStudents[studentId];
    if (!student) return;

    // Abrir o modal de confirmação no lugar do confirm nati
    if (typeof openRemoveStudentModal === 'function') {
        openRemoveStudentModal(studentId, student.name);
    }
}

// Lidar com envio do formulário de exclusão de aluno
document.getElementById('removeStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('removeStudentId').value;

    if (!studentId) return;

    if (useMockData) {
        delete mockData.students[studentId];
        updateLocalState(mockData);
    } else {
        db.ref('students/' + studentId).remove();
    }

    if (typeof closeRemoveStudentModal === 'function') {
        closeRemoveStudentModal();
    }
});

function renameStudent(studentId) {
    const student = currentStudents[studentId];
    if (!student) return;

    // Agora chama a função do escopo global (definida no HTML) para abrir o modal
    if (typeof openRenameStudentModal === 'function') {
        openRenameStudentModal(studentId, student.name);
    }
}

// Lidar com envio do formulário de renomeação de aluno
document.getElementById('renameStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('renameStudentId').value;
    const newName = document.getElementById('renameStudentName').value.trim();

    if (!studentId || !newName) return;

    if (useMockData) {
        if (mockData.students[studentId]) {
            mockData.students[studentId].name = newName;
            updateLocalState(mockData);
        }
    } else {
        db.ref('students/' + studentId + '/name').set(newName);
    }

    if (typeof closeRenameStudentModal === 'function') {
        closeRenameStudentModal();
    }
});

// Tornar funções acessíveis pelo escopo global (HTML onclick)
window.removeActivity = removeActivity;
window.renameActivity = renameActivity;
window.removeStudent = removeStudent;
window.renameStudent = renameStudent;
window.toggleActivityCheckbox = (studentId, activityId, isChecked) => {
    toggleActivityCompletion(studentId, activityId, isChecked);
};

function renderTeacherView() {
    const activitiesList = document.getElementById('activitiesListAdmin');
    const studentsTableBody = document.getElementById('studentsTableBody');
    const dynamicHeaders = document.getElementById('dynamicHeadersActivities');
    const noStudentsMsg = document.getElementById('noStudentsMsg');

    const actKeys = Object.keys(currentActivities || {});
    const totalActivities = actKeys.length;

    activitiesList.innerHTML = '';
    actKeys.forEach(actId => {
        const act = currentActivities[actId];
        activitiesList.innerHTML += `
            <li class="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span class="font-medium text-sm truncate pr-2">${act.title}</span>
                <div class="flex gap-1">
                    <button onclick="renameActivity('${actId}')" class="text-blue-500 hover:text-blue-700 p-1 rounded transition" title="Renomear">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onclick="removeActivity('${actId}')" class="text-red-500 hover:text-red-700 p-1 rounded transition" title="Remover">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </li>
        `;
    });

    if (actKeys.length === 0) {
        activitiesList.innerHTML = '<li class="text-sm text-gray-400 italic">Nenhuma atividade criada.</li>';
    }

    // Cabecalhos dinamicos das tabelas
    let headersHTML = '';
    actKeys.forEach(actId => {
        headersHTML += `<th class="py-3 px-2 text-center text-xs w-24"><div class="truncate w-20" title="${currentActivities[actId].title}">${currentActivities[actId].title}</div></th>`;
    });
    if (dynamicHeaders) {
        dynamicHeaders.colSpan = Math.max(1, actKeys.length);
    }

    const theadTr = document.querySelector('thead tr');
    while (theadTr.children.length > 2) {
        theadTr.removeChild(theadTr.lastChild);
    }
    actKeys.forEach(actId => {
        const th = document.createElement('th');
        th.className = "py-3 px-2 text-center font-semibold text-xs text-primary dark:text-indigo-400 border-l border-gray-200/50 dark:border-gray-700/50";
        th.innerHTML = `<div class="truncate w-24" title="${currentActivities[actId].title}">${currentActivities[actId].title}</div>`;
        theadTr.appendChild(th);
    });

    // Corpo da Tabela
    studentsTableBody.innerHTML = '';
    const stuKeys = Object.keys(currentStudents || {});

    if (stuKeys.length === 0) {
        noStudentsMsg.classList.remove('hidden');
    } else {
        noStudentsMsg.classList.add('hidden');

        stuKeys.forEach(stuId => {
            const student = currentStudents[stuId];
            const completedCount = Object.keys(student.completedActs || {}).length;

            let grade = 10;
            if (totalActivities > 0) {
                grade = (completedCount / totalActivities) * 10;
            } else {
                grade = 0;
            }
            const formattedGrade = grade.toFixed(1).replace('.0', '');

            let gradeColorClass = "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
            if (grade < 5 && totalActivities > 0) gradeColorClass = "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
            else if (grade < 8 && totalActivities > 0) gradeColorClass = "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";

            let tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition duration-150";

            let html = `
                <td class="py-4 pr-4 border-b border-gray-100 dark:border-gray-800">
                    <div class="flex items-center gap-3">
                        <div class="flex flex-col gap-1">
                            <button onclick="renameStudent('${stuId}')" class="text-blue-400 hover:text-blue-600 transition p-1 text-[10px] rounded hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Renomear Aluno">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onclick="removeStudent('${stuId}')" class="text-red-400 hover:text-red-600 transition p-1 text-[10px] rounded hover:bg-red-50 dark:hover:bg-red-900/30" title="Remover Aluno">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 shadow-inner">
                            ${student.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="font-medium whitespace-nowrap">${student.name}</span>
                    </div>
                </td>
                <td class="py-4 px-4 text-center border-b border-gray-100 dark:border-gray-800 border-l border-gray-100/50 dark:border-gray-800/50">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${gradeColorClass}">${formattedGrade}</span>
                </td>
            `;

            actKeys.forEach(actId => {
                const isChecked = student.completedActs && student.completedActs[actId] ? 'checked' : '';
                html += `
                    <td class="py-4 px-2 text-center border-b border-gray-100 dark:border-gray-800 border-l border-gray-100/50 dark:border-gray-800/50">
                        <label class="inline-flex items-center cursor-pointer">
                            <input type="checkbox" 
                                onchange="toggleActivityCheckbox('${stuId}', '${actId}', this.checked)"
                                class="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition duration-200 cursor-pointer"
                                ${isChecked}>
                        </label>
                    </td>
                `;
            });

            tr.innerHTML = html;
            studentsTableBody.appendChild(tr);
        });
    }
}


// ==========================================
// LÓGICA DO ALUNO
// ==========================================
let currentLoggedInStudentId = null;

function renderStudentSelector() {
    const selector = document.getElementById('studentSelector');
    selector.innerHTML = '<option value="" disabled selected>Selecione seu nome...</option>';

    Object.keys(currentStudents || {}).forEach(stuId => {
        const stu = currentStudents[stuId];
        selector.innerHTML += `<option value="${stuId}">${stu.name}</option>`;
    });
}

window.loginAsStudent = () => {
    const selector = document.getElementById('studentSelector');
    const stuId = selector.value;
    if (!stuId) {
        alert("Por favor, selecione seu nome na lista.");
        return;
    }

    currentLoggedInStudentId = stuId;

    document.getElementById('studentLoginView').classList.add('hidden');
    document.getElementById('roleSelection').classList.add('hidden');
    document.getElementById('studentDashboard').classList.remove('hidden');

    renderStudentDashboard(stuId);
};

window.logoutStudent = () => {
    currentLoggedInStudentId = null;
    document.getElementById('studentDashboard').classList.add('hidden');
    document.getElementById('roleSelection').classList.remove('hidden');
};

function renderStudentDashboard(stuId) {
    const student = currentStudents[stuId];
    if (!student) return;

    document.getElementById('studentNameDisplay').textContent = student.name;
    document.getElementById('studentAvatar').textContent = student.name.charAt(0).toUpperCase();

    const actKeys = Object.keys(currentActivities || {});
    const totalActivities = actKeys.length;
    const completedCount = Object.keys(student.completedActs || {}).length;

    let grade = 10;
    let percentage = 0;

    if (totalActivities > 0) {
        grade = (completedCount / totalActivities) * 10;
        percentage = (completedCount / totalActivities) * 100;
    } else {
        grade = 10;
        percentage = 100;
    }

    const circle = document.getElementById('gradeCircle');
    const circumference = 251.2;
    const offset = circumference - (percentage / 100) * circumference;

    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
        document.getElementById('studentGradeDisplay').textContent = grade.toFixed(1).replace('.0', '');

        document.getElementById('studentProgressBar').style.width = percentage + '%';
        document.getElementById('studentProgressText').textContent = Math.round(percentage) + '% Concluído';

        const msgEl = document.getElementById('gradeMessage');
        circle.classList.remove('text-secondary', 'text-yellow-500', 'text-red-500');

        if (grade === 10) {
            circle.classList.add('text-secondary');
            if (totalActivities > 0) msgEl.textContent = "Excelente! Você fez tudo!";
            else msgEl.textContent = "Aguardando atividades.";
            msgEl.className = "mt-2 text-sm font-bold text-secondary z-10 animate-pulse";
        } else if (grade >= 7) {
            circle.classList.add('text-yellow-500');
            msgEl.textContent = "Quase lá, não deixe de entregar.";
            msgEl.className = "mt-2 text-sm font-medium text-yellow-600 dark:text-yellow-400 z-10";
        } else {
            circle.classList.add('text-red-500');
            msgEl.textContent = "Atenção! Muitas atividades pendentes.";
            msgEl.className = "mt-2 text-sm font-medium text-red-600 dark:text-red-400 z-10";
        }
    }, 100);

    const grid = document.getElementById('studentActivitiesGrid');
    grid.innerHTML = '';

    if (totalActivities === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-6 text-gray-500">Nenhuma atividade cadastrada no momento.</div>';
        return;
    }

    actKeys.forEach(actId => {
        const act = currentActivities[actId];
        const isCompleted = student.completedActs && student.completedActs[actId];

        const cardClass = isCompleted
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

        const iconClass = isCompleted
            ? "bg-green-500 text-white"
            : "bg-red-100 text-red-500 dark:bg-red-900/50";

        const iconPath = isCompleted
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';

        const statusText = isCompleted ? "Entregue" : "Pendente";

        grid.innerHTML += `
            <div class="p-4 rounded-2xl border transition-all hover:scale-[1.02] shadow-sm ${cardClass} flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-gray-800 dark:text-gray-200">${act.title}</h4>
                    <p class="text-xs font-semibold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} uppercase tracking-wider mt-1">${statusText}</p>
                </div>
                <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-md ${iconClass}">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        ${iconPath}
                    </svg>
                </div>
            </div>
        `;
    });
}

// Tornar as funções globais para que os botões do index.html (onclick) as acessem
window.removeActivity = removeActivity;
window.removeStudent = removeStudent;
window.renameStudent = renameStudent;

// Inicia
initDatabaseListeners();

// ==========================================
// AUTENTICAÇÃO DO PROFESSOR (FIREBASE AUTH)
// ==========================================
document.getElementById('teacherLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('teacherEmailInput').value;
    const pwd = document.getElementById('teacherPasswordInput').value;
    const errorText = document.getElementById('teacherLoginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (useMockData) {
        // Fallback p/ o Mock
        if (pwd === 'mestre123') {
            errorText.classList.add('hidden');
            document.getElementById('teacherLoginView').classList.add('hidden');
            document.getElementById('teacherView').classList.remove('hidden');
            document.getElementById('teacherPasswordInput').value = '';
            document.getElementById('teacherEmailInput').value = '';
        } else {
            errorText.textContent = "Modo Demonstração: Senha é mestre123";
            errorText.classList.remove('hidden');
        }
    } else {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Entrando...";

        auth.signInWithEmailAndPassword(email, pwd)
            .then((userCredential) => {
                // Sucesso
                errorText.classList.add('hidden');
                document.getElementById('teacherLoginView').classList.add('hidden');
                document.getElementById('teacherView').classList.remove('hidden');

                // LimparCampos
                document.getElementById('teacherEmailInput').value = '';
                document.getElementById('teacherPasswordInput').value = '';
            })
            .catch((error) => {
                // Erro: Credenciais inválidas
                console.error("Erro no login:", error);
                errorText.classList.remove('hidden');
                errorText.textContent = "E-mail ou senha incorretos.";
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Entrar";
            });
    }
});
