from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Simulación Experimental")
#configuraremos el cors para el frontend
app.add_middleware(CORSMiddleware, 
                   allow_origins=["*"],
                   allow_credentials=True,
                   allow_methods=["*"],
                   allow_headers=["*"],
                   )
class DatosFaraday(BaseModel):
    espiras: int
    area: float
    campo_inicial: float
    campo_final: float
    tiempo: float

@app.get("/")
def read_root():
    return {"estado": "Servidor Activo", "proyecto": "Ley de Faraday"}

@app.post("/calcular-fem")
def calcular_fuerza_electromotriz(datos: DatosFaraday):
    #formula
    delta_campo = datos.campo_final - datos.campo_inicial
    flujo_magnetico = datos.area * delta_campo
    # Agregando validación simple por división en 0
    tiempo_valido = datos.tiempo if datos.tiempo > 0 else 0.001 
    fem = -datos.espiras * (flujo_magnetico / tiempo_valido)
    
    return {
        "fem_inducida": fem,
        "flujo_magnetico": flujo_magnetico,
        "mensaje": "calculo exitoso"
    }
