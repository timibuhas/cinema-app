import os
import re
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def _cfg():
    smtp_user = os.getenv("SMTP_USER", "")
    return {
        "smtp_host":      os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port":      int(os.getenv("SMTP_PORT", "465")),
        "smtp_user":      smtp_user,
        "smtp_password":  os.getenv("SMTP_PASSWORD", ""),
        "email_from":     os.getenv("EMAIL_FROM", smtp_user),
        "email_from_name": os.getenv("EMAIL_FROM_NAME", "TapTicket"),
        "twilio_sid":     os.getenv("TWILIO_ACCOUNT_SID", ""),
        "twilio_token":   os.getenv("TWILIO_AUTH_TOKEN", ""),
        "twilio_from":    os.getenv("TWILIO_PHONE_FROM", ""),
    }


def _normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("0") and len(digits) == 10:
        return "+4" + digits          # 07xx → +407xx
    if len(digits) == 9:
        return "+40" + digits         # 7xx → +407xx
    if not phone.startswith("+"):
        return "+" + digits
    return phone


def _time_str(dt: datetime | None) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d %B %Y la %H:%M")


def _email_layout(title: str, greeting: str, body_rows: list[tuple[str, str]], footer_note: str = "") -> str:
    rows_html = "".join(
        f"""<tr>
              <td style="padding:8px 12px;color:#888;white-space:nowrap">{label}</td>
              <td style="padding:8px 12px;font-weight:600">{value}</td>
            </tr>"""
        for label, value in body_rows
    )
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">🎬 TapTicket</p>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.6)">{title}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:16px;color:#333">{greeting}</p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8f8fa;border-radius:10px;border:1px solid #eee;overflow:hidden;">
              {rows_html}
            </table>
            {f'<p style="margin:24px 0 0;font-size:14px;color:#555">{footer_note}</p>' if footer_note else ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#f8f8fa;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa">TapTicket &mdash; aplicația ta pentru cinema</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_email(to_email: str, subject: str, html: str) -> bool:
    c = _cfg()
    if not c["smtp_user"] or not c["smtp_password"]:
        print(f"EMAIL_SKIP: SMTP_USER/SMTP_PASSWORD not configured")
        return False
    if not to_email:
        print("EMAIL_SKIP: recipient is empty")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{c['email_from_name']} <{c['email_from']}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        port = c["smtp_port"]
        if port == 465:
            with smtplib.SMTP_SSL(c["smtp_host"], port) as server:
                server.login(c["smtp_user"], c["smtp_password"])
                server.sendmail(c["email_from"], to_email, msg.as_string())
        else:
            with smtplib.SMTP(c["smtp_host"], port) as server:
                server.ehlo()
                server.starttls()
                server.login(c["smtp_user"], c["smtp_password"])
                server.sendmail(c["email_from"], to_email, msg.as_string())
        print(f"EMAIL_OK: sent '{subject}' to {to_email}")
        return True
    except Exception as exc:
        print(f"EMAIL_ERROR to {to_email}: {exc}")
        return False


def send_sms(to_phone: str, body: str) -> bool:
    c = _cfg()
    if not c["twilio_sid"] or not c["twilio_token"] or not c["twilio_from"]:
        print("SMS_SKIP: Twilio not configured")
        return False
    if not to_phone:
        return False
    normalized = _normalize_phone(to_phone)
    if not normalized:
        return False
    try:
        from twilio.rest import Client
        Client(c["twilio_sid"], c["twilio_token"]).messages.create(
            body=body, from_=c["twilio_from"], to=normalized,
        )
        print(f"SMS_OK: sent to {normalized}")
        return True
    except Exception as exc:
        print(f"SMS_ERROR to {normalized}: {exc}")
        return False


def notify_reservation_confirmed(
    *,
    user_name: str,
    user_email: str,
    user_phone: str,
    movie_title: str,
    hall_name: str,
    start_time: datetime | None,
    seats: list[str],
) -> None:
    seats_str = ", ".join(seats) if seats else "—"
    time = _time_str(start_time)

    html = _email_layout(
        title="Rezervare confirmată ✓",
        greeting=f"Bună, <strong>{user_name}</strong>! Rezervarea ta a fost confirmată cu succes.",
        body_rows=[
            ("🎬 Film", movie_title),
            ("📅 Dată și oră", time),
            ("🏛️ Sală", hall_name),
            ("💺 Locuri", seats_str),
        ],
        footer_note="Ne vedem la film! Prezintă această confirmare la intrare.",
    )
    send_email(user_email, f"Confirmare rezervare — {movie_title}", html)
    send_sms(
        user_phone,
        f"✓ Rezervare confirmată! {movie_title} · {time} · Sala {hall_name} · Locuri: {seats_str}. TapTicket",
    )


def notify_reservation_modified(
    *,
    user_name: str,
    user_email: str,
    user_phone: str,
    movie_title: str,
    hall_name: str,
    start_time: datetime | None,
    new_seats: list[str],
) -> None:
    seats_str = ", ".join(new_seats) if new_seats else "—"
    time = _time_str(start_time)

    html = _email_layout(
        title="Rezervare modificată",
        greeting=f"Bună, <strong>{user_name}</strong>! Locurile tale au fost modificate.",
        body_rows=[
            ("🎬 Film", movie_title),
            ("📅 Dată și oră", time),
            ("🏛️ Sală", hall_name),
            ("💺 Locuri noi", seats_str),
        ],
        footer_note="Dacă nu ai solicitat această modificare, contactează-ne.",
    )
    send_email(user_email, f"Rezervare modificată — {movie_title}", html)
    send_sms(
        user_phone,
        f"✎ Rezervare modificată! {movie_title} · {time} · Sala {hall_name} · Locuri noi: {seats_str}. TapTicket",
    )


def notify_reservation_reminder(
    *,
    user_name: str,
    user_email: str,
    user_phone: str,
    movie_title: str,
    hall_name: str,
    start_time: datetime | None,
    seats: list[str],
) -> None:
    seats_str = ", ".join(seats) if seats else "—"
    time = _time_str(start_time)

    html = _email_layout(
        title="Reminder — mâine ai rezervare 🍿",
        greeting=f"Bună, <strong>{user_name}</strong>! Îți amintim că <strong>mâine</strong> ai o rezervare la cinema.",
        body_rows=[
            ("🎬 Film", movie_title),
            ("📅 Dată și oră", time),
            ("🏛️ Sală", hall_name),
            ("💺 Locuri", seats_str),
        ],
        footer_note="Ne vedem mâine! 🎬",
    )
    send_email(user_email, f"Reminder: mâine ai rezervare la {movie_title}", html)
    send_sms(
        user_phone,
        f"🍿 Reminder! Mâine: {movie_title} · {time} · Sala {hall_name} · Locuri: {seats_str}. TapTicket",
    )
