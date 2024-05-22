let mode = 0; // 0: queue mode, 1: stack mode, 2: priority_queue mode
let token = '';

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('newTask');
    input.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            addTask();
        }
    });
	const input2 = document.getElementById('priority');
	input2.addEventListener('keyup', function(event) {
		if (event.key === 'Enter') {
			addTask();
		}
	});
	updateToDeleteTask();
    updateModeIndicator();
    const priorityInput = document.getElementById('priority');
    priorityInput.style.display = 'none'; // 初期状態で非表示

    document.body.classList.add('auth-page');
});

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
    });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.auth) {
            token = data.token;
            document.getElementById('auth').style.display = 'none';
            document.getElementById('task-manager').style.display = 'block';
            loadTasks();
            document.body.classList.remove('auth-page');
        } else {
            alert('ログインに失敗しました');
        }
    });
}

function logout() {
    token = '';
    document.getElementById('auth').style.display = 'block';
    document.getElementById('task-manager').style.display = 'none';
    document.getElementById('taskList').innerHTML = '';
    document.body.classList.add('auth-page');
}


function loadTasks() {
    fetch('http://localhost:3000/tasks', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'x-access-token': token
        }
    })
    .then(response => response.json())
    .then(tasks => {
        const list = document.getElementById('taskList');
        list.innerHTML = ''; // タスクリストをクリア
        tasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.textContent = task.priority !== null ? `${task.task} (${task.priority})` : task.task;
            list.appendChild(listItem);
        });
        updateModeIndicator();
        updateToDeleteTask();
    });
    
}

function addTask() {
    const taskInput = document.getElementById('newTask');
    const priorityInput = document.getElementById('priority');
    const newTask = taskInput.value.trim();
    const priority = parseInt(priorityInput.value, 10);

    if (newTask && (mode === 2 && !isNaN(priority) || mode !== 2)) {
        fetch('/task', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-access-token': token
            },
            body: JSON.stringify({ task: newTask, priority: priority })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const list = document.getElementById('taskList');
                const listItem = document.createElement('li');
                listItem.textContent = mode === 2 ? `${newTask} (${priority})` : newTask;

                if (mode === 2) { // priority_queue mode
                    let inserted = false;
                    Array.from(list.children).forEach(child => {
                        const childPriority = parseInt(child.textContent.match(/\((\d+)\)$/)[1], 10);
                        if (priority > childPriority && !inserted) {
                            list.insertBefore(listItem, child);
                            inserted = true;
                        }
                    });
                    if (!inserted) list.appendChild(listItem);
                } else if (mode === 1) {
                    list.insertBefore(listItem, list.firstChild);
                } else {
                    list.appendChild(listItem);
                }

                updateToDeleteTask();
                taskInput.value = '';
                if (mode === 2) priorityInput.value = '';
            } else {
                alert('タスクの追加に失敗しました。');
            }
        });
    } else {
        alert('タスクを入力してください！' + (mode === 2 ? ' 優先度も正しく入力してください。' : ''));
    }
}

function deleteTask() {
    const list = document.getElementById('taskList');
    let taskToBeRemoved = (mode === 2) ? getHighestPriorityTask(list) : list.firstChild;
    if (taskToBeRemoved) {
		taskToBeRemoved.classList.add('highlight');
        setTimeout(() => {
            list.removeChild(taskToBeRemoved);
            taskToBeRemoved.style.backgroundColor = '';
            updateToDeleteTask();
        }, 500); // 0.5秒後に削除
    } else {
        alert('削除するタスクがありません！');
    }
}

function getHighestPriorityTask(list) {
    return Array.from(list.children).reduce((max, child) => {
        const maxPriority = max ? parseInt(max.textContent.match(/\((\d+)\)$/)[1], 10) : -Infinity;
        const childPriority = parseInt(child.textContent.match(/\((\d+)\)$/)[1], 10);
        return (!max || childPriority > maxPriority) ? child : max;
    }, null);
}

function toggleMode() {
	const list = document.getElementById('taskList');
	if(list.children.length !== 0) alert('タスクが残っています。');
	else {
    	mode = (mode + 1) % 3;
    	updateModeIndicator();
		updateToDeleteTask();
	}
}

function updateModeIndicator() {
    const modes = ["queue mode", "stack mode", "priority_queue mode"];
    const modeIndicator = document.getElementById('modeIndicator');
    const priorityInput = document.getElementById('priority');
    
    modeIndicator.textContent = `(${modes[mode]})`;
    priorityInput.style.display = mode === 2 ? '' : 'none'; // priority_queue modeでのみ表示

    document.body.classList.remove('queue-mode', 'stack-mode', 'priority-queue-mode');
    if (mode === 0) {
        document.body.classList.add('queue-mode');
    } else if (mode === 1) {
        document.body.classList.add('stack-mode');
    } else {
        document.body.classList.add('priority-queue-mode');
    }
}

function updateToDeleteTask() {
	const list = document.getElementById('taskList');
	Array.from(list.children).forEach(child => {
		child.classList.remove('delete-task');
	});
	let oldestTask = (mode !== 2) ? list.firstChild : getHighestPriorityTask(list);
	if (oldestTask) {
		oldestTask.classList.add('delete-task');
	}
}