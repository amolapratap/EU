import httpx
from app.config import settings
from app.notices.utils import clean_pdf_url


ONESIGNAL_APP_ID = settings.ONESIGNAL_APP_ID
ONESIGNAL_API_KEY = settings.ONESIGNAL_API_KEY


async def send_push_notification(notice):

    pdf_url = clean_pdf_url(notice.get("full_pdf_url") or notice.get("pdf_link"))

    payload = {
        "app_id": ONESIGNAL_APP_ID,

        "included_segments": ["All"],

        "headings": {
            "en": "🚨 New BEU Notice"
        },

        "contents": {
            "en": notice.get("title", "BEU Notice")
        },

        "url": pdf_url or "https://alpharesult.in"
    }

    headers = {
        "Authorization": f"Basic {ONESIGNAL_API_KEY}",
        "Content-Type": "application/json"
    }

    try:

        async with httpx.AsyncClient() as client:

            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                headers=headers,
                json=payload
            )

            return response.json()

    except Exception as e:

        print("Push Error:", str(e))

        return None
