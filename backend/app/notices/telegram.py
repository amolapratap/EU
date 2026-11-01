import httpx
from app.config import settings


BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
CHANNEL_ID = settings.TELEGRAM_CHANNEL_ID


async def send_telegram_notice(notice):

    text = (
        f"🚨 New BEU Notification\n\n"
        f"📌 {notice['title']}\n\n"
        f"📅 {notice['notice_date']}\n\n"
        # f"🔗 https://alpharesult.in/notices/{notice['beu_notice_id']}\n\n"
        f"🔗 {notice['full_pdf_url']}\n\n"
        f"⚡ Via Alpha Result"
    )

    url = (
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    )

    payload = {
        "chat_id": CHANNEL_ID,
        "text": text,
         "disable_web_page_preview": False
    }

    try:
        
        async with httpx.AsyncClient() as client:

            response = await client.post(
                url,
                json=payload
            )

            return response.json()

    except Exception as e:
        print("Telegram Error:", str(e))

        return None
