import httpx
from app.config import settings
from app.notices.utils import clean_pdf_url


BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
CHANNEL_ID = settings.TELEGRAM_CHANNEL_ID


async def send_telegram_notice(notice):

    pdf_url = clean_pdf_url(notice.get("full_pdf_url") or notice.get("pdf_link"))
    link_line = f"🔗 {pdf_url}\n\n" if pdf_url else ""

    text = (
        f"🚨 New BEU Notification\n\n"
        f"📌 {notice.get('title', '')}\n\n"
        f"📅 {notice.get('notice_date', '')}\n\n"
        f"{link_line}"
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
