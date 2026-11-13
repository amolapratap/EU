from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import connect_to_mongo, close_mongo_connection, ensure_user_indexes

# Import routers (for now empty, we add later)
# from app.public.routes import router as public_router
from app.auth.routes import router as auth_router
from app.public2.routes import router as public_router
from app.public2.result.routes import router as result_router
from app.sa.routes import router as super_admin_router
from app.admin.routes import router as admin_router
from app.user.routes import router as user_router
from app.auth.google_routes import router as google_router
from app.cron.routes import router as scheduler_router
from app.quiz.routes import router as quiz_router
from app.admin.blog.routes import router as admin_blog_router
from app.public2.blog.routes import router as public_blog_router
from app.electives.routes import router as v2_router
from app.electives.controllers import ensure_elective_indexes
from app.ai_solve.routes import router as ai_solve_router



from app.notices.scheduler import scheduler
from app.notices.controllers import check_new_notices



from fastapi.responses import JSONResponse
from typing import Any

#  Define custom JSON response class that replaces Cloudinary with Cloudflare CDN
class CdnJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        # Generate the standard JSON bytes
        raw_bytes = super().render(content)
        # Globally replace Cloudinary with Cloudflare CDN in raw C-speed bytes!
        return raw_bytes.replace(
            b"https://res.cloudinary.com",
            b"https://cdn.alpharesult.in"
        )


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    default_response_class=CdnJSONResponse
)



origins = [
    "https://alpharesult.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://www.alpharesult.in",
]    

# CORS (Allows frontend to call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # change later to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# To detect new notice and add in db in db
scheduler.add_job(
    check_new_notices,
    "interval",
    minutes=10
)

# scheduler.start()


# Startup & Shutdown Events
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await ensure_user_indexes()
    await ensure_elective_indexes()
    scheduler.start()
    print("Scheduler started")


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    scheduler.shutdown()
    print("Scheduler stopped")

# Root Route
@app.get("/")
def root():
    return {"message": "EU Study Backend Running 🚀"}

# All routes api
app.include_router(public_router, prefix="/api/public", tags=["Public"])
app.include_router(result_router, prefix="/api/public/result", tags=["Result"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(super_admin_router, prefix="/sa", tags=["Super-Admin"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(user_router, prefix="/user", tags=['User'])
app.include_router(google_router, prefix="/auth/google", tags=["GoogleAuth"])
app.include_router(scheduler_router, prefix="/cron", tags=["Scheduler"])

#  INCLUDE QUIZ ROUTER (NEW)
app.include_router(quiz_router, prefix="/api/quiz", tags=["Quiz"])

#  BLOG ROUTERS (ADMIN & PUBLIC)
app.include_router(admin_blog_router, prefix="/admin/blog", tags=["Admin Blog"])
app.include_router(public_blog_router, prefix="/api/public/blog", tags=["Public Blog"])

#  V2 ROUTER (NEW ELECTIVE-AWARE SUBJECTS)
app.include_router(v2_router, prefix="/api/v2", tags=["V2"])
app.include_router(v2_router, prefix="/api/public/v2", tags=["V2 Public"])
app.include_router(v2_router, prefix="/user/v2", tags=["V2 User"])

# AI STUDENT SOLVE ROUTER
app.include_router(ai_solve_router, prefix="/api/ai", tags=["AI Student Solve"])



