import os
from fastapi import APIRouter
from pydantic import BaseModel
from notifications import send_email, _email_layout

router = APIRouter()


class ContactFormSchema(BaseModel):
    name: str
    email: str
    subject: str
    message: str


@router.post("/contact")
def contact_form(form: ContactFormSchema):
    admin_email = os.getenv("SMTP_USER", os.getenv("EMAIL_FROM", ""))
    html = _email_layout(
        title="Mesaj nou prin formularul de contact",
        greeting=f"Ai primit un mesaj nou de la <strong>{form.name}</strong> ({form.email}):",
        body_rows=[
            ("Nume", form.name),
            ("Email", form.email),
            ("Subiect", form.subject),
            ("Mesaj", form.message.replace("\n", "<br>")),
        ],
    )
    send_email(admin_email, f"[Contact] {form.subject} — {form.name}", html)
    return {"ok": True}
