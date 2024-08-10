let aircraftData = {};
let chartInstance;

// Función para convertir litros a US Gallons
function litersToGallons(liters) {
    return (liters * 0.264172).toFixed(2);
}

function loadAircraftData() {
    fetch('aircraftData.json')
        .then(response => response.json())
        .then(data => {
            aircraftData = data;
            populateAircraftSelect();
            console.log(aircraftData); // Verificar que los datos se carguen correctamente
        })
        .catch(error => console.error('Error loading aircraft data:', error));
}

function populateAircraftSelect() {
    const selectElement = document.getElementById('aircraftSelect');
    selectElement.innerHTML = '<option value="" disabled selected>Select an aircraft</option>';

    for (const registration in aircraftData) {
        const option = document.createElement('option');
        option.value = registration;
        option.textContent = `${registration} (${aircraftData[registration].type})`;
        selectElement.appendChild(option);
    }
}

function updateFormFields() {
    const selectedAircraft = document.getElementById('aircraftSelect').value;
    const formContainer = document.getElementById('formContainer');
    if (aircraftData[selectedAircraft]) {
        formContainer.style.display = 'block'; // Mostrar el formulario

        const aircraft = aircraftData[selectedAircraft];
        document.getElementById('emptyWeight').value = aircraft.emptyWeight;
        document.getElementById('emptyCG').value = aircraft.emptyCG;
        document.getElementById('pilotArm').value = aircraft.pilotArm;
        document.getElementById('baggageArm').value = aircraft.baggageAreaArm;
        document.getElementById('tailconeArm').value = aircraft.tailconeBaggageAreaArm;

        // Actualizar los botones de selección rápida de combustible con descripciones
        document.getElementById('halfFuelBtn').innerHTML = `${aircraft.halfFuelDescription} (${aircraft.halfFuelLiters}L | ${litersToGallons(aircraft.halfFuelLiters)} USGAL)`;
        document.getElementById('threeQuartersFuelBtn').innerHTML = `${aircraft.threeQuartersFuelDescription} (${aircraft.threeQuartersFuelLiters}L | ${litersToGallons(aircraft.threeQuartersFuelLiters)} USGAL)`;
        document.getElementById('fullFuelBtn').innerHTML = `${aircraft.fullFuelDescription} (${aircraft.fullFuelLiters}L | ${litersToGallons(aircraft.fullFuelLiters)} USGAL)`;

        // Por defecto, seleccionar el máximo combustible
        document.getElementById('fuelLiters').value = aircraft.fullFuelLiters;
        calculateFuelWeight(); // Calcular peso y momento del combustible
        selectFuel('full', 'fullFuelBtn');

        document.getElementById('pilotWeight').value = 0;
        document.getElementById('baggageWeight').value = 0;
        document.getElementById('tailconeWeight').value = 0;

        // Cargar la imagen del avión
        const aircraftImageContainer = document.getElementById('aircraftImageContainer');
        const imagePath = `images/${aircraft.image}`;
        aircraftImageContainer.innerHTML = `<img src="${imagePath}" alt="${aircraft.type}" class="img-fluid">`;

        // Ocultar la sección de resultados hasta que se vuelva a calcular el CG
        document.getElementById('resultsSection').style.display = 'none';

        // Crear filas de asientos adicionales si existen
        const additionalSeatsContainer = document.getElementById('additionalSeatsContainer');
        additionalSeatsContainer.innerHTML = '';  // Limpiar contenido anterior
        if (aircraft.seats && aircraft.seats.length > 0) {
            aircraft.seats.forEach((seat, index) => {
                const seatRow = document.createElement('div');
                seatRow.className = 'row mb-3';
                seatRow.innerHTML = `
                    <div class="col">
                        <label for="seatWeight${index}" class="form-label">${seat.label} MASS (kg):</label>
                        <input type="number" id="seatWeight${index}" name="seatWeight${index}" class="form-control user-input" min="0" value="0" required>
                    </div>
                    <div class="col">
                        <label for="seatArm${index}" class="form-label">${seat.label} ARM (m):</label>
                        <input type="number" id="seatArm${index}" name="seatArm${index}" class="form-control" step="0.01" value="${seat.arm}" readonly>
                    </div>
                `;
                additionalSeatsContainer.appendChild(seatRow);
            });
        }
    } else {
        formContainer.style.display = 'none'; // Ocultar el formulario si no hay avión seleccionado
    }
}

function selectFuel(level, btnId) {
    const selectedAircraft = document.getElementById('aircraftSelect').value;
    if (aircraftData[selectedAircraft]) {
        const aircraft = aircraftData[selectedAircraft];
        let liters = 0;
        if (level === 'half') {
            liters = aircraft.halfFuelLiters;
        } else if (level === 'threeQuarters') {
            liters = aircraft.threeQuartersFuelLiters;
        } else if (level === 'full') {
            liters = aircraft.fullFuelLiters;
        }

        document.getElementById('fuelLiters').value = liters;
        calculateFuelWeight();  // Calcula los kilos automáticamente

        // Establecer el ARM correcto dependiendo de la cantidad de combustible seleccionado
        let fuelArm = aircraft.fuelArmDefault;
        if (liters === aircraft.halfFuelLiters) {
            fuelArm = aircraft.fuelArm46_5L;
        }
        document.getElementById('fuelArm').value = fuelArm;

        // Desmarcar todos los botones antes de marcar el seleccionado
        const buttons = document.querySelectorAll('.fuel-buttons button');
        buttons.forEach(button => button.classList.remove('active'));

        // Marcar el botón seleccionado como activo
        document.getElementById(btnId).classList.add('active');
    }
}


function calculateFuelWeight() {
    const liters = parseFloat(document.getElementById('fuelLiters').value);
    const weight = Math.ceil(liters * 0.72); // Redondear hacia arriba
    document.getElementById('fuelWeight').value = weight;
}

function calculateCG() {
    // Obtener los valores actuales del formulario
    calculateFuelWeight();  // Asegura que los kilos de combustible estén calculados antes de continuar

    const selectedAircraft = document.getElementById('aircraftSelect').value;
    const aircraft = aircraftData[selectedAircraft];
    const emptyWeight = parseFloat(document.getElementById('emptyWeight').value);
    const emptyCG = parseFloat(document.getElementById('emptyCG').value);
    const fuelWeight = parseFloat(document.getElementById('fuelWeight').value);
    const fuelArm = parseFloat(document.getElementById('fuelArm').value);
    const pilotWeight = Math.ceil(parseFloat(document.getElementById('pilotWeight').value));
    const pilotArm = parseFloat(document.getElementById('pilotArm').value);
    const baggageWeight = Math.ceil(parseFloat(document.getElementById('baggageWeight').value));
    const baggageArm = parseFloat(document.getElementById('baggageArm').value);
    const tailconeWeight = Math.ceil(parseFloat(document.getElementById('tailconeWeight').value));
    const tailconeArm = parseFloat(document.getElementById('tailconeArm').value);

    // Cálculo de momentos
    const emptyMoment = emptyWeight * emptyCG;
    const fuelMoment = Math.ceil(fuelWeight * fuelArm);
    const pilotMoment = Math.ceil(pilotWeight * pilotArm);
    const baggageMoment = Math.ceil(baggageWeight * baggageArm);
    const tailconeMoment = Math.ceil(tailconeWeight * tailconeArm);

    // Cálculo de momentos para asientos adicionales
    let additionalSeatMoment = 0;
    let additionalSeatWeight = 0;
    let additionalSeatRows = ''; // Filas adicionales para la tabla de resultados
    if (aircraft.seats && aircraft.seats.length > 0) {
        aircraft.seats.forEach((seat, index) => {
            const seatWeight = Math.ceil(parseFloat(document.getElementById(`seatWeight${index}`).value) || 0);
            const seatArm = parseFloat(document.getElementById(`seatArm${index}`).value);
            const seatMoment = Math.ceil(seatWeight * seatArm);

            additionalSeatMoment += seatMoment;
            additionalSeatWeight += seatWeight;

            additionalSeatRows += `
                <tr>
                    <td>${seat.label}</td>
                    <td>${seatWeight} KG</td>
                    <td>${seatArm.toFixed(2)}</td>
                    <td>${seatMoment} KGm</td>
                </tr>
            `;
        });
    }

    // Sumatorio de pesos y momentos
    const totalWeight = emptyWeight + fuelWeight + pilotWeight + baggageWeight + tailconeWeight + additionalSeatWeight;
    const totalMoment = emptyMoment + fuelMoment + pilotMoment + baggageMoment + tailconeMoment + additionalSeatMoment;

    // Coordenadas del CG
    const cgResult = { x: totalMoment, y: totalWeight };

    // Mostrar la sección de resultados
    document.getElementById('resultsSection').style.display = 'block';

    // Mostrar los resultados en la tabla
    const resultTable = document.getElementById('resultTable');
    resultTable.innerHTML = `
        <tr>
            <td>Empty Weight</td>
            <td>${emptyWeight.toFixed(2)} KG</td>
            <td>${emptyCG.toFixed(2)}</td>
            <td>${emptyMoment.toFixed(2)} KGm</td>
        </tr>
        <tr>
            <td>Fuel</td>
            <td>${fuelWeight} KG</td>
            <td>${fuelArm.toFixed(2)}</td>
            <td>${fuelMoment} KGm</td>
        </tr>
        <tr>
            <td>Pilot</td>
            <td>${pilotWeight} KG</td>
            <td>${pilotArm.toFixed(2)}</td>
            <td>${pilotMoment} KGm</td>
        </tr>
        ${additionalSeatRows}
        <tr>
            <td>Baggage Area</td>
            <td>${baggageWeight} KG</td>
            <td>${baggageArm.toFixed(2)}</td>
            <td>${baggageMoment} KGm</td>
        </tr>
        <tr>
            <td>Tailcone Baggage Area</td>
            <td>${tailconeWeight} KG</td>
            <td>${tailconeArm.toFixed(2)}</td>
            <td>${tailconeMoment} KGm</td>
        </tr>
    `;

    document.getElementById('totalWeight').textContent = totalWeight.toFixed(2) + ' KG';
    document.getElementById('totalMoment').textContent = totalMoment.toFixed(2) + ' KGm';

    // Verificar si el peso total excede el peso máximo permitido
    const maxWeightMessageContainer = document.getElementById('maxWeightMessage');
    const errorMessageContainer = document.getElementById('errorMessage');
    let errorMessages = [];

    maxWeightMessageContainer.innerHTML = `<strong>CAUTION: MAXIMUM TAKE OFF MASS: ${aircraft.maxWeight.toFixed(2)} KG</strong>`;
    errorMessageContainer.innerHTML = "";  // Limpiar mensajes anteriores

    if (totalWeight > aircraft.maxWeight) {
        errorMessages.push(`ERROR: EXCEEDED MAXIMUM ALLOWED MASS!`);
    }

    // Verificar si el CG está fuera del envelope
    drawChart(cgResult, errorMessages);

    // Mostrar los mensajes de error, si los hay
    if (errorMessages.length > 0) {
        errorMessageContainer.innerHTML = errorMessages.map(msg => `<span style="color: red; font-weight: bold;">${msg}</span>`).join('<br>');
    }
}

function drawChart(cgResult, errorMessages) {
    const ctx = document.getElementById('cgChart').getContext('2d');
    const selectedAircraft = document.getElementById('aircraftSelect').value;

    if (!aircraftData[selectedAircraft]) {
        console.error('No envelope data found for the selected aircraft.');
        return;
    }

    const aircraft = aircraftData[selectedAircraft];
    const envelopes = aircraft.envelopes || []; // Si no hay envelopes, devolver una lista vacía
    const graphLimits = aircraft.graphLimits;

    // Destruir el gráfico anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Crear datasets para cada envelope
    const datasets = envelopes.map((envelope, index) => ({
        label: envelope.label,
        data: envelope.points.concat([envelope.points[0]]),  // Conectar el último punto al primero para cerrar el envelope
        fill: false,
        borderColor: `rgba(${(index * 70) % 255}, ${(index * 140) % 255}, 255, 1)`,  // Cambiar color para cada envelope
        showLine: true,
        pointRadius: 0
    }));

    // Añadir el punto del CG calculado
    datasets.push({
        label: 'Center of Gravity',
        data: [cgResult],
        backgroundColor: 'red'
    });

    // Crear el gráfico con los envelopes y el CG calculado
    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: graphLimits.xMin,
                    max: graphLimits.xMax,
                    title: {
                        display: true,
                        text: 'Loaded Aircraft Moment (KGm)'
                    }
                },
                y: {
                    min: graphLimits.yMin,
                    max: graphLimits.yMax,
                    title: {
                        display: true,
                        text: 'Loaded Aircraft Weight (KG)'
                    }
                }
            }
        }
    });

    // Verificar si el CG está dentro de algún envelope
    const isInsideEnvelope = envelopes.some(envelope => checkIfInsideEnvelope(cgResult, envelope.points));
    const isWithinGraphLimits = checkIfWithinGraphLimits(cgResult, graphLimits);

    if (!isInsideEnvelope || !isWithinGraphLimits) {
        errorMessages.push(`WARNING: CG IS OUTSIDE THE ENVELOPE OR GRAPH LIMITS!`);
    }
}


function checkIfInsideEnvelope(cgResult, envelope) {
    let isInside = false;

    for (let i = 0, j = envelope.length - 1; i < envelope.length; j = i++) {
        const xi = envelope[i].x, yi = envelope[i].y;
        const xj = envelope[j].x, yj = envelope[j].y;

        const intersect = ((yi > cgResult.y) != (yj > cgResult.y)) &&
            (cgResult.x < (xj - xi) * (cgResult.y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }

    return isInside;
}

function checkIfWithinGraphLimits(cgResult, graphLimits) {
    return cgResult.x >= graphLimits.xMin && cgResult.x <= graphLimits.xMax &&
           cgResult.y >= graphLimits.yMin && cgResult.y <= graphLimits.yMax;
}

function resetForm() {
    // Resetea el formulario
    document.getElementById('loadForm').reset();

    // Reinicia los campos que tienen valores específicos o que no se resetean automáticamente
    document.getElementById('fuelWeight').value = '';
    document.getElementById('fuelArm').value = '';
    document.getElementById('aircraftSelect').value = '';
    
    // Limpiar el contenedor de imagen
    document.getElementById('aircraftImageContainer').innerHTML = '';

    // Limpiar cualquier fila adicional de asientos
    document.getElementById('additionalSeatsContainer').innerHTML = '';

    // Ocultar la sección de resultados
    document.getElementById('resultsSection').style.display = 'none';

    // Desmarcar botones de combustible
    const buttons = document.querySelectorAll('.fuel-buttons button');
    buttons.forEach(button => button.classList.remove('active'));

    // Restablecer la fecha actual
    setDefaultDate();

    // Ocultar el formulario de nuevo
    document.getElementById('formContainer').style.display = 'none';
}

// Establecer la fecha actual en el campo de fecha por defecto
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Cargar los datos de los aviones y establecer la fecha por defecto cuando se cargue la página
window.onload = function() {
    loadAircraftData();
    setDefaultDate();
};
