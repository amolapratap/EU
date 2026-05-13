from bson.tz_util import utc
from app.database import db_instance
from app.utils.datetime import utcnow
from app.notices.services import fetch_beu_notices
from app.notices.telegram import send_telegram_notice
from app.notices.onesignal import send_push_notification



async def check_new_notices():

    print("started checking---", "Time", utcnow())
    notices = await fetch_beu_notices()

    for notice in notices:

        beu_notice_id = notice["id"]

        existing = await db_instance.db.beu_notices.find_one({
            "beu_notice_id": beu_notice_id
        })

        if existing:
            continue

        pdf_link = notice.get("link")

        full_pdf_url = (
            f"https://beu-bih.ac.in/backend/{pdf_link}"
        )

        doc = {
            "beu_notice_id": beu_notice_id,

            "title": notice.get("board"),

            "notice_date": notice.get("noticedate"),

            "pdf_link": pdf_link,

            "full_pdf_url": full_pdf_url,

            "is_important": bool(notice.get("isimportant")),

            "telegram_sent": False,
            "push_sent": False,

            "created_at": utcnow()
        }

        await db_instance.db.beu_notices.insert_one(doc)

        print("New BEU Notice:", doc["title"])

        
        # TELEGRAM
        telegram_res = await send_telegram_notice(doc)

        if telegram_res:
            print(" Telegram Sent")

        
        # PUSH Browser Notification
        push_res = await send_push_notification(doc)

        if push_res:
            print(" Browser Notification Push Sent")

    return None