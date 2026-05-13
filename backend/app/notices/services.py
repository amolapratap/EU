import httpx

BEU_API = "https://beu-bih.ac.in/backend/v1/notice/get-notice-board"


async def fetch_beu_notices():

    async with httpx.AsyncClient() as client:

        response = await client.get(BEU_API)

        response.raise_for_status()

        return response.json()