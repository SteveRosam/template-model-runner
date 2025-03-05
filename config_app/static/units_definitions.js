document.addEventListener('DOMContentLoaded', function() {
    fetch('http://localhost:5000/get_units')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.getElementById('unitsTable').getElementsByTagName('tbody')[0];
        data.forEach(unit => {
            addRowToTable(tableBody, unit);
        });
    })
    .catch(error => {
        console.error('Error loading units:', error);
    });
});

document.getElementById('addUnitButton').addEventListener('click', function() {
    const tableBody = document.getElementById('unitsTable').getElementsByTagName('tbody')[0];
    addRowToTable(tableBody, '');
    showSubmitButton();
});

document.getElementById('unitsForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const units = [];
    const rows = document.getElementById('unitsTable').getElementsByTagName('tbody')[0].rows;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.classList.contains('deleted')) { // Skip deleted rows
            const unitName = row.cells[0].getElementsByTagName('input')[0].value;
            units.push(unitName);
        }
    }

    fetch('http://localhost:5000/publish_units', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(units)
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('responseMessage').textContent = data.message || 'Error publishing units';
        hideSubmitButton();
    })
    .catch(error => {
        document.getElementById('responseMessage').textContent = 'Error: ' + error;
    });
});

function addRowToTable(tableBody, unit) {
    const newRow = tableBody.insertRow();

    const unitCell = newRow.insertCell(0);
    const actionCell = newRow.insertCell(1);

    unitCell.innerHTML = `<input type="text" name="unitName" value="${unit}" required>`;
    actionCell.innerHTML = `<button type="button" class="delete-button">Delete</button>`;

    actionCell.querySelector('.delete-button').addEventListener('click', function() {
        newRow.classList.toggle('deleted'); // Toggle the 'deleted' class

        // Change button text based on the current state
        if (newRow.classList.contains('deleted')) {
            this.textContent = 'Un-Delete';
            Array.from(newRow.querySelectorAll('input')).forEach(element => {
                element.disabled = true;
            });
        } else {
            this.textContent = 'Delete';
            Array.from(newRow.querySelectorAll('input')).forEach(element => {
                element.disabled = false;
            });
        }

        showSubmitButton();
    });

    unitCell.querySelector('input').addEventListener('input', function() {
        showSubmitButton();
    });
}

function showSubmitButton() {
    document.getElementById('submitButton').style.display = 'inline';
}

function hideSubmitButton() {
    document.getElementById('submitButton').style.display = 'none';
}