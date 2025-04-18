// DOM Elements
const taskInput = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const finishDayBtn = document.getElementById("finish-day-btn");
const moveTodayBtn = document.getElementById("move-today-btn");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const dateContainer = document.getElementById("date-container");
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");

// State
let tasks = JSON.parse(localStorage.getItem("tasks")) || {};
let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);
let editingId = null;
let draggedItem = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateDateDisplay();
  renderTasks();
  updateProgressBar();
  setupDragAndDrop();
});

// Event Listeners
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => e.key === "Enter" && addTask());
taskList.addEventListener("click", handleTaskAction);
finishDayBtn.addEventListener("click", finishDay);
moveTodayBtn.addEventListener("click", moveTasksToToday);
prevDayBtn.addEventListener("click", () => navigateDays(-1));
nextDayBtn.addEventListener("click", () => navigateDays(1));

// Drag and Drop Setup
function setupDragAndDrop() {
  taskList.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("task-item")) {
      draggedItem = e.target;
      e.target.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", e.target.innerHTML);
    }
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const afterElement = getDragAfterElement(e.clientY);
    if (afterElement) {
      taskList.insertBefore(draggedItem, afterElement);
    } else {
      taskList.appendChild(draggedItem);
    }
  });

  taskList.addEventListener("dragend", (e) => {
    if (e.target.classList.contains("task-item")) {
      e.target.classList.remove("dragging");
      saveNewTaskOrder();
    }
  });
}

function getDragAfterElement(y) {
  const draggableElements = [
    ...taskList.querySelectorAll(".task-item:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function saveNewTaskOrder() {
  const dateKey = currentDate.toISOString().split("T")[0];
  if (!tasks[dateKey]) return;

  const taskElements = taskList.querySelectorAll(".task-item");
  taskElements.forEach((element, index) => {
    const taskId = parseInt(element.dataset.id);
    const taskIndex = tasks[dateKey].findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      tasks[dateKey][taskIndex].order = index;
    }
  });

  saveTasks();
}

// Date Navigation
function navigateDays(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateDateDisplay();
  renderTasks();
  updateProgressBar();
}

function updateDateDisplay() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  document.querySelector(".day-name").textContent = days[currentDate.getDay()];
  document.querySelector(".date-number").textContent = currentDate.getDate();
  document.querySelector(".month-name").textContent =
    months[currentDate.getMonth()];

  // Highlight today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (currentDate.getTime() === today.getTime()) {
    dateContainer.style.backgroundColor = "#e0e8d8";
    moveTodayBtn.style.display = "none";
  } else {
    dateContainer.style.backgroundColor = "#f0f4ec";
    moveTodayBtn.style.display = "flex";
  }
}

// Task Functions
function addTask() {
  const taskText = taskInput.value.trim();
  if (!taskText) return;

  const dateKey = currentDate.toISOString().split("T")[0];

  if (!tasks[dateKey]) {
    tasks[dateKey] = [];
  }

  if (editingId !== null) {
    // Update existing task
    const taskIndex = tasks[dateKey].findIndex((task) => task.id === editingId);
    if (taskIndex !== -1) {
      tasks[dateKey][taskIndex].text = taskText;
      saveTasks();
      editingId = null;
    }
  } else {
    // Add new task
    const newTask = {
      id: Date.now(),
      text: taskText,
      completed: false,
      createdAt: new Date(),
      order: tasks[dateKey].length,
    };
    tasks[dateKey].push(newTask);
    saveTasks();
  }

  taskInput.value = "";
  renderTasks();
  updateProgressBar();
}

function handleTaskAction(e) {
  const target = e.target.closest(".task-btn");
  if (!target) return;

  const taskItem = target.closest(".task-item");
  const taskId = parseInt(taskItem.dataset.id);
  const dateKey = currentDate.toISOString().split("T")[0];

  if (target.classList.contains("complete-btn")) {
    toggleTaskCompletion(dateKey, taskId);
  } else if (target.classList.contains("delete-btn")) {
    deleteTask(dateKey, taskId);
  }
}

function toggleTaskCompletion(dateKey, id) {
  if (!tasks[dateKey]) return;

  tasks[dateKey] = tasks[dateKey].map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  renderTasks();
  updateProgressBar();
}

function deleteTask(dateKey, id) {
  if (!tasks[dateKey]) return;

  tasks[dateKey] = tasks[dateKey].filter((task) => task.id !== id);
  // Reorder remaining tasks
  tasks[dateKey].forEach((task, index) => {
    task.order = index;
  });
  saveTasks();
  renderTasks();
  updateProgressBar();
}

function moveTasksToToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split("T")[0];
  const currentKey = currentDate.toISOString().split("T")[0];

  if (!tasks[currentKey] || tasks[currentKey].length === 0) return;

  if (!tasks[todayKey]) {
    tasks[todayKey] = [];
  }

  // Move incomplete tasks to today
  const incompleteTasks = tasks[currentKey].filter((task) => !task.completed);
  incompleteTasks.forEach((task) => {
    task.order = tasks[todayKey].length;
    tasks[todayKey].push(task);
  });

  // Remove moved tasks from original date
  tasks[currentKey] = tasks[currentKey].filter((task) => task.completed);

  saveTasks();
  currentDate = today;
  updateDateDisplay();
  renderTasks();
  updateProgressBar();

  alert(`Moved ${incompleteTasks.length} tasks to today`);
}

function finishDay() {
  const dateKey = currentDate.toISOString().split("T")[0];
  if (!tasks[dateKey] || tasks[dateKey].length === 0) return;

  if (confirm("Complete all tasks for this day?")) {
    // Mark all tasks as completed
    tasks[dateKey].forEach((task) => {
      task.completed = true;
    });

    saveTasks();
    renderTasks();
    updateProgressBar();
  }
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function updateProgressBar() {
  const dateKey = currentDate.toISOString().split("T")[0];
  const dayTasks = tasks[dateKey] || [];

  if (dayTasks.length === 0) {
    progressFill.style.width = "0%";
    progressText.textContent = "0/0 tasks";
    return;
  }

  const completedTasks = dayTasks.filter((task) => task.completed).length;
  const progressPercentage = Math.round(
    (completedTasks / dayTasks.length) * 100
  );
  progressFill.style.width = `${progressPercentage}%`;
  progressText.textContent = `${completedTasks}/${dayTasks.length} tasks completed`;
}

function renderTasks() {
  taskList.innerHTML = "";

  const dateKey = currentDate.toISOString().split("T")[0];
  const dayTasks = tasks[dateKey] || [];

  if (dayTasks.length === 0) {
    // Add empty state
    const emptyState = document.createElement("li");
    emptyState.className = "task-item";
    emptyState.innerHTML = `
            <div style="text-align: center; width: 100%; color: #888; padding: 20px;">
                <i class="fas fa-leaf" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                <div>No tasks for this day</div>
            </div>
        `;
    taskList.appendChild(emptyState);
    return;
  }

  // Sort tasks by order and completion status
  dayTasks
    .sort((a, b) => a.order - b.order)
    .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
    .forEach((task) => {
      const taskElement = document.createElement("li");
      taskElement.className = "task-item";
      taskElement.dataset.id = task.id;
      taskElement.draggable = !task.completed;

      // Update the taskElement.innerHTML section to use the revert icon
      taskElement.innerHTML = `
<div class="task-icon">
    <i class="fas fa-leaf"></i>
</div>
<span class="task-text ${task.completed ? "completed" : ""}">
    ${task.text}
</span>
<div class="task-actions">
    <button class="task-btn complete-btn" title="${
      task.completed ? "Mark as active" : "Mark as completed"
    }">
        ${task.completed ? "↩" : '<i class="fas fa-check"></i>'}
    </button>
    <button class="task-btn delete-btn" title="Delete task">
        <i class="fas fa-times"></i>
    </button>
</div>
`;

      taskList.appendChild(taskElement);
    });
}
