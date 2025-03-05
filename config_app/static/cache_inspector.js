document.addEventListener('DOMContentLoaded', function() {
    fetch('http://localhost:5000/read')
    .then(response => response.json())
    .then(data => {
        const display = document.getElementById('valueDisplay');
        display.innerHTML = ''; // Clear any existing content

        // Iterate over the items in the data object
        for (const [key, value] of Object.entries(data)) {
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = `<h2>${key}</h2>`;

            if (typeof value === 'object' && !Array.isArray(value)) {
                const p = document.createElement('p');
                p.textContent = `${JSON.stringify(value)}`;
                sectionDiv.appendChild(p);
            } else if (Array.isArray(value)) {
                // If the value is an array, iterate over its elements
                value.forEach(item => {
                    const p = document.createElement('p');
                    p.textContent = `${JSON.stringify(item)}`;
                    sectionDiv.appendChild(p);
                });
            } else {
                // If the value is a primitive, display it directly
                const p = document.createElement('p');
                p.textContent = `${key}: ${value}`;
                sectionDiv.appendChild(p);
            }

            display.appendChild(sectionDiv);
        }
    })
    .catch(error => {
        document.getElementById('valueDisplay').textContent = 'Error: ' + error;
    });
});