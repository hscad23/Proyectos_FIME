const btnCalcular =document.getElementById('btn-calcular');
const resultadoContainer =document.getElementById('resultado-container');
const valorFemDisplay =document.getElementById('calor-fem');

Window.addEventListener('DOMContentLoaded', () => {
    gsap.from(".p3-header h1", { duration: 0.8, x: -50 , opacity: 0, ease: "power3.out"});
    gsap.from(".decorative-line", {duration: 1, scalex: 0, transformOrigin: "left", ease: "power3.inout", delay: 0.2});
    gsap.from(".input-group", {
        duration: 0.5,
        x: -30,
        opacity: 0,
        stagger: 0.1,
        ease: "back.out(1.7)",
        delay: 0.4
    });
    gsap.from(".p3-button", {duration: 0.5, y: 30, opacity:0, ease: "power2.out", delay:1});
});
btnCalcular.addEventListener('click', async () => {
    gsap.to(btnCalcular, {duration: 0.1, scale: 0.95, yoyo: true, repeat: 1});
    const datos = {
        espiras: parseInt(document.getElementById('espiras').value),
        area: parseFloat(document.getElementById('area').value),
        campo_inicial: parseFloat(document.getElementById('campo_inicial').value),
        campo_final: parseFloat(document.getElementById('campo_final').value),
        tiempo: parseFloat(document.getElementById('tiempo').value)
    };
    if (Object.values(datos).some(val => isNaN(val))){
        alert("!cuidado¡ Verifica que todos los campos tengan numeros validos.");
        return;
    }

    try {
        const textoOriginal = btnCalcular.innerText;
        btnCalcular.innerText = "CALCULANDO..";
        const response = await fetch('http://localhost:8000/calcular-fem',{
            method: 'POST',
            headers: { 'container-Type': 'application/json' },
            body:JSON.stringify(datos)
        });
        const resultado = await response.json();
        btnCalcular.innerText = textoOriginal;
        mostrarResultado(resultado.fem_inducida);

    } catch (error) {
        console.log("Error al connectarte al servidor:", error);
        alert("Fallo de conexión. ¿Está encendido los contenedores?");
        btnCalcular.innerText = "CALCULAR FEM";
    }
});

function mostrarResultado(valorFem) {
    valorFemDisplay.innerText = `${valorFem.toFixed(2)} V`;
    resultadoContainer.classList.remove('hidden');
    gsap.killTweensOF(resultadoContainer);
    gsap.fromTo(resultadoContainer,
        {scale:0, rotation: -10, opacity: 0 },
        {duration: 0.6, scale: 1, rotation: 0, opacity: 1, ease: "elastic.out(1, 0.5)" }
    );
}