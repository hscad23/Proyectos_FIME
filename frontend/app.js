// Selectores del Dashboard y HUD
const btnCalcular = document.getElementById('btn-calculadora');
const hudMultimetro = document.getElementById('hud-multimetro');
const hudVoltaje = document.getElementById('hud-voltaje');
const hudEstado = document.getElementById('hud-estado');
const logRegistros = document.getElementById('log-registros');
const tooltip = document.getElementById('tooltip');

const canvasOsc = document.getElementById('osciloscopio');
const ctxOsc = canvasOsc ? canvasOsc.getContext('2d') : null;
let oscHistorial = [];
let maxPicoSweep = 0; // Acumulador de la máxima magnitud por sweep

// Sliders y Labels
const sliderFuerza = document.getElementById('campo_fuerza');
const lblFuerza = document.getElementById('valor-fuerza');
const sliderEspiras = document.getElementById('espiras');
const lblEspiras = document.getElementById('valor-espiras');
const sliderArea = document.getElementById('area');
const lblArea = document.getElementById('valor-area');
const sliderTiempo = document.getElementById('tiempo');
const lblTiempo = document.getElementById('valor-tiempo');
const sliderResistencia = document.getElementById('resistencia');
const lblResistencia = document.getElementById('valor-resistencia');

const toggleAuto = document.getElementById('auto-reproducir');
let autoLoopActive = false;

// Actualizaciones de UI Seguras
if (sliderEspiras) {
    sliderEspiras.addEventListener('input', (e) => {
        lblEspiras.innerText = e.target.value;
        if (window.simulador3D) window.simulador3D.actualizarBobina(parseInt(e.target.value));
    });
}
if (sliderFuerza) {
    sliderFuerza.addEventListener('input', (e) => {
        lblFuerza.innerText = e.target.value;
        if (window.simulador3D && window.simulador3D.actualizarTamanioMange) {
            window.simulador3D.actualizarTamanioMange(parseFloat(e.target.value));
        }
    });
}
if (sliderArea) {
    sliderArea.addEventListener('input', (e) => lblArea.innerText = e.target.value);
}
if (sliderTiempo) {
    sliderTiempo.addEventListener('input', (e) => lblTiempo.innerText = e.target.value);
}
if (sliderResistencia) {
    sliderResistencia.addEventListener('input', (e) => lblResistencia.innerText = e.target.value);
}

// Interactividad Tooltip Canvas
if(canvasOsc) {
    canvasOsc.addEventListener('mousemove', (e) => {
        if(oscHistorial.length === 0) return;
        const rect = canvasOsc.getBoundingClientRect();
        // Coordenadas relativas al canvas
        const mx = e.clientX - rect.left;
        
        // Mapear posición x a índice del historial (Max 100)
        let index = Math.floor((mx / rect.width) * 100);
        if(index < 0) index = 0;
        if(index >= oscHistorial.length) index = oscHistorial.length - 1;
        
        let vol = oscHistorial[index];
        if(vol !== undefined) {
            let res = parseFloat(sliderResistencia.value) || 1;
            let amp = vol / res;
            
            tooltip.classList.remove('hidden');
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = (e.clientY) + 'px';
            tooltip.innerHTML = `V: <span style="color:var(--p3-light-blue)">${vol.toFixed(3)} V</span><br>
                                 I: <span style="color:var(--danger-red)">${amp.toFixed(3)} A</span>`;
        }
    });

    canvasOsc.addEventListener('mouseout', () => {
        tooltip.classList.add('hidden');
    });
}

toggleAuto.addEventListener('change', (e) => {
    autoLoopActive = e.target.checked;
    if (autoLoopActive) {
        hudEstado.innerText = "AUTO-LOOP ACTIVO";
        ejecutarSimulacion(true);
    } else {
        hudEstado.innerText = "ESTABILIZADO";
        gsap.killTweensOf("*");
    }
});

btnCalcular.addEventListener('click', () => {
    if(!autoLoopActive) ejecutarSimulacion(false);
});

// Función para guardar 5 registros en pantalla
function añadirRegistro(volts_max) {
    let rs = parseFloat(sliderResistencia.value) || 1;
    let amps_max = volts_max / rs;
    
    const li = document.createElement('li');
    li.innerHTML = `Pico Detectado: 
                    <span class="log-val">${volts_max.toFixed(2)}V</span> 
                    <span class="log-amp">${amps_max.toFixed(2)}A</span>`;
    
    // Lo empujamos al tope del ul
    logRegistros.prepend(li);
    
    // Poda si pasamos de 5
    if(logRegistros.children.length > 5) {
        logRegistros.removeChild(logRegistros.lastChild);
    }
}

async function ejecutarSimulacion(isAuto) {
    const datos = {
        espiras: parseInt(sliderEspiras.value),
        area: parseFloat(sliderArea.value),
        campo_inicial: 0.1,
        campo_final: parseFloat(sliderFuerza.value),
        tiempo: parseFloat(sliderTiempo.value)
    };

    try {
        const response = await fetch('http://localhost:8000/calcular-fem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const resultado = await response.json();
        
        hudEstado.style.color = "var(--danger-red)";
        
        if (window.simulador3D) {
            oscHistorial = [];
            maxPicoSweep = 0; // Iniciamos cacería de picos
            
            window.simulador3D.animarEntradaSalida(
                datos.tiempo, 
                resultado.fem_inducida,
                (femInstante) => {
                    let ruido = (Math.random() - 0.5) * (Math.abs(resultado.fem_inducida) * 0.1);
                    let medicionRealista = femInstante + ruido;
                    
                    if (Math.abs(medicionRealista) > Math.abs(maxPicoSweep)) {
                        maxPicoSweep = medicionRealista;
                    }
                    
                    hudVoltaje.innerText = `${medicionRealista.toFixed(3)} V`;
                    oscHistorial.push(medicionRealista);
                    if(oscHistorial.length > 100) oscHistorial.shift();
                    
                    if(ctxOsc) {
                        ctxOsc.clearRect(0,0, canvasOsc.width, canvasOsc.height);
                        
                        ctxOsc.strokeStyle = 'rgba(0, 208, 255, 0.15)';
                        ctxOsc.lineWidth = 1;
                        let midY = canvasOsc.height / 2;
                        
                        // Linea base Eje X
                        ctxOsc.beginPath(); ctxOsc.moveTo(0, midY); ctxOsc.lineTo(canvasOsc.width, midY); ctxOsc.stroke();
                        
                        // Dinamismo gráfico
                        ctxOsc.beginPath();
                        ctxOsc.strokeStyle = '#ff003c';
                        ctxOsc.lineWidth = 2;
                        let scaleY = (canvasOsc.height / 2.5) / (resultado.fem_inducida || 1);
                        
                        for(let i=0; i<oscHistorial.length; i++){
                            let x = (i / 100) * canvasOsc.width;
                            let y = midY - (oscHistorial[i] * scaleY);
                            if(i===0) ctxOsc.moveTo(x,y);
                            else ctxOsc.lineTo(x,y);
                        }
                        ctxOsc.stroke();
                    }
                },
                () => {
                    // Acción al terminar 1 barrido GSAP completo
                    añadirRegistro(maxPicoSweep);
                    maxPicoSweep = 0;
                    
                    if (autoLoopActive) {
                        ejecutarSimulacion(true);
                    } else {
                        hudEstado.style.color = "var(--p3-light-blue)";
                        hudVoltaje.innerText = "0.000 V";
                    }
                }
            );
        }
    } catch (error) {
        console.error(error);
    }
}