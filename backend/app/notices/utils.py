from urllib.parse import urlsplit, urlunsplit, quote, unquote


def clean_pdf_url(pdf_link: str | None) -> str | None:
    """
    Format and percent-encode PDF links received from BEU.
    Ensures that spaces and special characters are properly encoded (e.g. ' ' -> '%20')
    so that Telegram, browsers, and push notifications do not break the URL.
    """
    if not pdf_link:
        return None

    link = str(pdf_link).strip()
    if not link:
        return None

    # If it's already an absolute URL (e.g. https://results.beup.ac.in/...)
    if link.startswith("http://") or link.startswith("https://"):
        parts = urlsplit(link)
        quoted_path = quote(unquote(parts.path), safe="/@:")
        return urlunsplit((parts.scheme, parts.netloc, quoted_path, parts.query, parts.fragment))

    # Relative path/filename from BEU backend
    clean_path = quote(unquote(link.lstrip("/")), safe="/@:")
    return f"https://beu-bih.ac.in/backend/{clean_path}"
