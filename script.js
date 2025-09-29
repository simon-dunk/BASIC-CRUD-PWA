// --- DOM Elements ---
const employeeForm = document.getElementById('employee-form');
const employeeIdInput = document.getElementById('employee-id');
const nameInput = document.getElementById('name');
const positionInput = document.getElementById('position');
const employeeList = document.getElementById('employee-list');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');

// --- API Base URL ---
const API_URL = 'http://10.200.26.218:7070/api/employees';

// --- State ---
let employees = [];
let isEditing = false;

// --- Functions ---

// RENDER: Display employees in the list
function renderEmployees() {
    employeeList.innerHTML = ''; // Clear the list first
    if (employees.length === 0) {
        employeeList.innerHTML = `<li class="p-4 text-center text-gray-500">No employees found. Add one above!</li>`;
        return;
    }
    employees.forEach(employee => {
        const li = document.createElement('li');
        li.className = 'p-4 flex justify-between items-center list-item';
        li.innerHTML = `
            <div>
                <p class="font-semibold text-lg">${employee.name}</p>
                <p class="text-gray-600">${employee.position}</p>
            </div>
            <div class="space-x-2">
                <button onclick="editEmployee('${employee.id}')" class="text-blue-500 hover:text-blue-700 font-medium">Edit</button>
                <button onclick="deleteEmployee('${employee.id}')" class="text-red-500 hover:text-red-700 font-medium">Delete</button>
            </div>
        `;
        employeeList.appendChild(li);
    });
}

// FETCH all employees from the server
async function fetchEmployees() {
    try {
        const response = await fetch(API_URL);
        employees = await response.json();
        renderEmployees();
    } catch (error) {
        console.error('Error fetching employees:', error);
    }
}

// CREATE / UPDATE: Handle form submission
employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const position = positionInput.value.trim();
    const id = employeeIdInput.value;

    const employeeData = { name, position };

    try {
        if (isEditing) {
            // Update existing employee
            await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
        } else {
            // Add new employee
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
        }
        fetchEmployees(); // Re-fetch to update the list
        resetForm();
    } catch (error) {
        console.error('Error saving employee:', error);
    }
});

// EDIT: Populate form for editing
window.editEmployee = function(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    isEditing = true;
    employeeIdInput.value = employee.id;
    nameInput.value = employee.name;
    positionInput.value = employee.position;

    formTitle.textContent = 'Edit Employee';
    submitButton.textContent = 'Save Changes';
    cancelButton.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// DELETE: Remove an employee
window.deleteEmployee = async function(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchEmployees(); // Re-fetch to update the list
        } catch (error) {
            console.error('Error deleting employee:', error);
        }
    }
}

// Reset the form
function resetForm() {
    employeeForm.reset();
    employeeIdInput.value = '';
    isEditing = false;
    formTitle.textContent = 'Add New Employee';
    submitButton.textContent = 'Add Employee';
    cancelButton.classList.add('hidden');
}

cancelButton.addEventListener('click', resetForm);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees(); // Fetch employees on page load

    // Register the Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('Service Worker registered with scope:', registration.scope))
            .catch(error => console.error('Service Worker registration failed:', error));
    }
});