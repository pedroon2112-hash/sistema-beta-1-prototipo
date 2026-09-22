import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from lib.sqlite_db import init_db  # noqa: E402
from routers.admin import router as admin_router  # noqa: E402
from routers.public import router as public_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria o schema e aplica o seed inicial (uma única vez) antes de servir.
    init_db()
    logger.info("SQLite pronto")
    yield


app = FastAPI(lifespan=lifespan, title="GalegonN API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "galegonn", "status": "ok"}


api_router.include_router(public_router)
api_router.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# include_router é a ÚLTIMA instrução: rota registrada depois daqui não é servida.
app.include_router(api_router)
