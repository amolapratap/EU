import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from app.config import settings

load_dotenv()

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,                   #os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=settings.CLOUDINARY_API_KEY,                         #os.getenv("CLOUDINARY_API_KEY"),
    api_secret=settings.CLOUDINARY_API_SECRET                    #os.getenv("CLOUDINARY_API_SECRET"),
)


from app.utils.logger import logger

async def delete_file(public_id: str):
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type="raw"
        )

        status = result.get("result")

        if status == "ok":
            logger.info(f"Deleted file: {public_id}")
            print("Deleet Status",status)
            return True

        elif status == "not found":
            logger.warning(f"Already deleted: {public_id}")
            print("Deleet Status",status)
            return True

        else:
            logger.error(f"Unexpected response: {result}")
            print("Deleet Status",status)
            return False

    except Exception as e:
        logger.error(f"Cloudinary delete error: {str(e)}")
        print("Deleet Status",e)
        return False





async def upload_solution_image(
    file_bytes: bytes,
    public_id: str
):

    try:

        result = cloudinary.uploader.upload(
            file_bytes,

            folder="alpha_result",

            public_id=public_id,

            overwrite=True,

            resource_type="image"
        )

        return {
            "success": True,

            "image_url": result.get("secure_url"),

            "public_id": result.get("public_id")
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }