from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware

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
    delta_campo = campo_final - campo_inicial
    flujo_magnetico = area * delta_campo
    fem = -espiras * (flujo_magnetico / tiempo)
    return {
        "fem inducido": fem,
        "flujo_magnetico": flujo_magnetico,
        "mensaje": "calculo exitoso"
    }



