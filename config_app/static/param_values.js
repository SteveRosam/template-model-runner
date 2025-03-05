document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        fetch('https://0.0.0.0:80/get_parameters').then(response => response.json()),
        fetch('https://0.0.0.0:80/read_parameter_data').then(response => response.json())
    ])
    .then(([parameters, existingData]) => {
        const form = document.getElementById('dynamicForm');
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        const parameterNames = parameters.map(param => param.name);

        parameters.forEach(param => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = param.name;
            row.appendChild(nameCell);

            const inputCell = document.createElement('td');
            let input;
            const existingValue = existingData[param.name] || '';

            switch (param.type) {
                case 'string':
                    input = document.createElement('input');
                    input.type = 'text';
                    input.value = existingValue;
                    break;
                case 'number':
                    input = document.createElement('input');
                    input.type = 'number';
                    input.value = existingValue;
                    break;
                case 'boolean':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = existingValue === 'on' || existingValue === true;
                    break;
                case 'object':
                case 'array':
                    input = document.createElement('textarea');
                    input.value = JSON.stringify(existingValue, null, 2);
                    break;
                default:
                    input = document.createElement('input');
                    input.type = 'text';
                    input.value = existingValue;
            }

            input.name = param.name;
            input.required = param.required;
            inputCell.appendChild(input);
            row.appendChild(inputCell);

            const unitCell = document.createElement('td');
            unitCell.textContent = param.units || ''; // Display units if available
            row.appendChild(unitCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        form.appendChild(table);

        // Display values in cache but not in parameters
        const extraValuesDiv = document.createElement('div');
        extraValuesDiv.innerHTML = '<h3>Extra Values in Cache</h3>';
        const extraValuesList = document.createElement('ul');

        Object.keys(existingData).forEach(key => {
            if (!parameterNames.includes(key)) {
                const listItem = document.createElement('li');
                listItem.textContent = `${key}: ${existingData[key]}`;

                // Add a delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete-button';
                deleteButton.addEventListener('click', function() {
                    delete existingData[key]; // Remove the value from the cache
                    listItem.remove(); // Remove the list item from the UI

                    // Optionally, send a request to update the cache on the server
                    fetch('https://0.0.0.0:80/delete_parameter_value', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ key: key })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Deleted:', data);
                    })
                    .catch(error => {
                        console.error('Error deleting parameter value:', error);
                    });
                });

                listItem.appendChild(deleteButton);
                extraValuesList.appendChild(listItem);
            }
        });

        extraValuesDiv.appendChild(extraValuesList);
        form.appendChild(extraValuesDiv);

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            const formData = new FormData(form);
            const jsonData = {};

            formData.forEach((value, key) => {
                jsonData[key] = value;
            });

            fetch('https://0.0.0.0:80/publish_parameter_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    })
    .catch(error => {
        console.error('Error loading parameters or existing data:', error);
    });
});