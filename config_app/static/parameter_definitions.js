let availableUnits = [];

document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        fetch('https://config-app-demo-templatemodelrunner-dev.demo.quix.io/get_parameters').then(response => response.json()),
        fetch('https://config-app-demo-templatemodelrunner-dev.demo.quix.io/get_units').then(response => response.json())
    ])
    .then(([parameters, units]) => {
        availableUnits = units;
        const tableBody = document.getElementById('parameterTable').getElementsByTagName('tbody')[0];
        parameters.forEach(param => {
            addRowToTable(tableBody, param.name, param.type, param.required, param.units, units, param);
        });
    })
    .catch(error => {
        console.error('Error loading parameters or units:', error);
    });
});

document.getElementById('addRowButton').addEventListener('click', function() {
    const tableBody = document.getElementById('parameterTable').getElementsByTagName('tbody')[0];
    addRowToTable(tableBody, '', 'string', false, '', availableUnits);
    showSubmitButton();
});

document.getElementById('publishForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const parameters = [];
    const rows = document.getElementById('parameterTable').getElementsByTagName('tbody')[0].rows;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.classList.contains('deleted')) { // Skip deleted rows
            const parameterName = row.cells[0].getElementsByTagName('input')[0].value;
            const type = row.cells[1].getElementsByTagName('select')[0].value;
            const required = row.cells[2].getElementsByTagName('input')[0].checked;
            const units = row.cells[3].getElementsByTagName('select')[0].value;

            parameters.push({
                name: parameterName,
                type: type,
                required: required,
                units: units
            });
        }
    }

    fetch('https://config-app-demo-templatemodelrunner-dev.demo.quix.io/publish_param_defs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(parameters)
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('responseMessage').textContent = data.message || 'Error publishing data';
        updateChangesTable(parameters);
        hideSubmitButton();
    })
    .catch(error => {
        document.getElementById('responseMessage').textContent = 'Error: ' + error;
    });
});

function addRowToTable(tableBody, name, type, required, selectedUnit, units = [], originalParam) {
    const newRow = tableBody.insertRow();

    const nameCell = newRow.insertCell(0);
    const typeCell = newRow.insertCell(1);
    const requiredCell = newRow.insertCell(2);
    const unitsCell = newRow.insertCell(3);
    const actionCell = newRow.insertCell(4);

    nameCell.innerHTML = `<input type="text" name="parameterName" value="${name}" required>`;
    typeCell.innerHTML = `
        <select name="type">
            <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
            <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
            <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
            <option value="object" ${type === 'object' ? 'selected' : ''}>Object</option>
            <option value="array" ${type === 'array' ? 'selected' : ''}>Array</option>
        </select>
    `;
    requiredCell.innerHTML = `<input type="checkbox" name="required" ${required ? 'checked' : ''}>`;

    const isValidUnit = units.includes(selectedUnit);
    const unitsOptions = units.map(unit => `<option value="${unit}" ${unit === selectedUnit ? 'selected' : ''}>${unit}</option>`).join('');
    unitsCell.innerHTML = `<select name="units"><option value="" ${!isValidUnit ? 'selected' : ''}></option>${unitsOptions}</select>`;

    actionCell.innerHTML = `<button type="button" class="delete-button">Delete</button>`;

    actionCell.querySelector('.delete-button').addEventListener('click', function() {
        newRow.classList.toggle('deleted');

        if (newRow.classList.contains('deleted')) {
            this.textContent = 'Un-Delete';
            Array.from(newRow.querySelectorAll('input, select')).forEach(element => {
                element.disabled = true;
            });
        } else {
            this.textContent = 'Delete';
            Array.from(newRow.querySelectorAll('input, select')).forEach(element => {
                element.disabled = false;
            });
        }

        updateChangesTable();
        showSubmitButton();
    });

    // Mark the new row as changed
    newRow.classList.add('changed');
    updateChangesTable();

    // Add event listeners to detect changes
    nameCell.querySelector('input').addEventListener('input', function() {
        highlightChange(newRow, this, originalParam ? originalParam.name : '');
        updateChangesTable();
    });
    typeCell.querySelector('select').addEventListener('change', function() {
        highlightChange(newRow, this, originalParam ? originalParam.type : '');
        updateChangesTable();
    });
    requiredCell.querySelector('input').addEventListener('change', function() {
        highlightChange(newRow, this, originalParam ? originalParam.required : false);
        updateChangesTable();
    });
    unitsCell.querySelector('select').addEventListener('change', function() {
        highlightChange(newRow, this, originalParam ? originalParam.units : '');
        updateChangesTable();
    });
}

function highlightChange(row, element, originalValue) {
    const currentValue = element.type === 'checkbox' ? element.checked : element.value;
    const parentTd = element.parentElement; // Get the parent <td> element

    if (currentValue !== originalValue) {
        parentTd.classList.add('changed'); // Add the 'changed' class to the parent <td>
        element.title = `Original: ${originalValue}`;
        showSubmitButton();
    } else {
        parentTd.classList.remove('changed'); // Remove the 'changed' class if no change
        element.title = '';
    }
}

function showSubmitButton() {
    document.getElementById('submitButton').style.display = 'inline';
}

function hideSubmitButton() {
    document.getElementById('submitButton').style.display = 'none';
}

function updateChangesTable() {
    const changesTableBody = document.getElementById('changesTable').getElementsByTagName('tbody')[0];
    changesTableBody.innerHTML = ''; // Clear existing rows

    const rows = document.getElementById('parameterTable').getElementsByTagName('tbody')[0].rows;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const parameterName = row.cells[0].getElementsByTagName('input')[0].value;
        const type = row.cells[1].getElementsByTagName('select')[0].value;
        const required = row.cells[2].getElementsByTagName('input')[0].checked;
        const units = row.cells[3].getElementsByTagName('select')[0].value;

        const originalName = row.cells[0].getElementsByTagName('input')[0].title.replace('Original: ', '') || parameterName;
        const originalType = row.cells[1].getElementsByTagName('select')[0].title.replace('Original: ', '') || type;
        const originalRequired = row.cells[2].getElementsByTagName('input')[0].title.replace('Original: ', '') || required;
        const originalUnits = row.cells[3].getElementsByTagName('select')[0].title.replace('Original: ', '') || units;

        if (row.classList.contains('deleted')) {
            const newRow = changesTableBody.insertRow();
            newRow.insertCell(0).textContent = parameterName;
            newRow.insertCell(1).textContent = 'Deleted';
        } else if (parameterName !== originalName || type !== originalType || required !== originalRequired || units !== originalUnits) {
            const newRow = changesTableBody.insertRow();
            newRow.insertCell(0).innerHTML = 'previous<br/>current';
            newRow.insertCell(1).innerHTML = parameterName !== originalName ? `<span style="color: red;">${originalName}</span><br><span style="color: green;">${parameterName}</span>` : `<span style="color: black;">${originalName}</span>`;
            newRow.insertCell(2).innerHTML = type !== originalType ? `<span style="color: red;">${originalType}</span><br><span style="color: green;">${type}</span>` : `<span style="color: black;">${originalType}</span>`;
            newRow.insertCell(3).innerHTML = required !== originalRequired ? `<span style="color: red;">${originalRequired ? 'Yes' : 'No'}</span><br><span style="color: green;">${required ? 'Yes' : 'No'}</span>` : `<span style="color: black;">${originalRequired ? 'Yes' : 'No'}</span>`;
            newRow.insertCell(4).innerHTML = units !== originalUnits ? `<span style="color: red;">${originalUnits}</span><br><span style="color: green;">${units}</span>` : `<span style="color: black;">${originalUnits}</span>`;
        }
    }
}