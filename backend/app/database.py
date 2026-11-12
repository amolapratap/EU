from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, OperationFailure
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
    If duplicates already exist, log them and keep the server running.
    """
    try:
        await db_instance.db.users.create_index(
            "email",
            unique=True,
            name="users_email_unique_idx",
        )
    except (DuplicateKeyError, OperationFailure) as e:
        print(
            "⚠️  Unique index on users.email was not created because "
            "duplicate emails already exist.\n"
            "    Inspect:  python backend/scripts/fix_duplicate_user_emails.py\n"
            "    Fix:      python backend/scripts/fix_duplicate_user_emails.py --apply\n"
            f"    MongoDB:  {e}"
        )

async def close_mongo_connection():
    """
    Close DB when server shuts down
    """
    db_instance.client.close()
    print("🛑 MongoDB connection closed")
