from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    """
    Connect to MongoDB when server starts
    """
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[settings.MONGO_DB_NAME]
    print("🚀 Connected to MongoDB")


async def ensure_user_indexes():
    """
    Prevent two user documents from storing the same email.
    Fails if the collection already has duplicate emails — clean those first.
    """
    await db_instance.db.users.create_index(
        "email",
        unique=True,
        name="users_email_unique_idx",
    )

async def close_mongo_connection():
    """
    Close DB when server shuts down
    """
    db_instance.client.close()
    print("🛑 MongoDB connection closed")
