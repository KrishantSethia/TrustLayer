from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router
from projects.router import router as projects_router
from milestones.router import router as milestones_router
from bids.router import router as bids_router
from disputes.router import router as disputes_router
from users.router import router as users_router
from admin.router import router as admin_router
from webhooks.razorpay import router as webhooks_router
from scheduler.setup import start_scheduler, stop_scheduler
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="TrustLayer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", settings.FRONTEND_URL, "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,       prefix="/auth",  tags=["Auth"])
app.include_router(projects_router,                    tags=["Projects"])
app.include_router(milestones_router,                  tags=["Milestones"])
app.include_router(bids_router,                        tags=["Bids"])
app.include_router(disputes_router,                    tags=["Disputes"])
app.include_router(users_router,                       tags=["Users"])
app.include_router(admin_router,                       tags=["Admin"])
app.include_router(webhooks_router,                    tags=["Webhooks"])


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}
