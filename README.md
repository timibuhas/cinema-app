# TapTicket - Platformă Web pentru Cinematograf

TapTicket este o aplicație web de tip full-stack pentru managementul unui cinematograf, realizată ca proiect de licență. Utilizatorii pot naviga catalogul de filme, rezerva locuri printr-un selector vizual interactiv și interacționa cu un asistent AI conversațional. Administratorii dispun de instrumente complete pentru gestionarea filmelor, sălilor, proiecțiilor și utilizatorilor.

Proiectul demonstrează implementarea unei arhitecturi three-tier moderne, cu autentificare JWT, notificări automate prin e-mail și integrarea unui model de limbaj local (Gemma 3:4b) pentru funcționalitatea de chatbot.

## Tehnologii utilizate

**Frontend:** React 19, Vite 7, Tailwind CSS, Shadcn/ui, React Router DOM 7  
**Backend:** FastAPI, SQLAlchemy 2.0, PostgreSQL 16, APScheduler  
**AI:** Ollama + Gemma 3:4b  
**Infrastructură:** Docker Compose, Nginx

## Funcționalități principale

- Catalog de filme cu filtre, trailer YouTube embed și sistem de recenzii
- Selector vizual interactiv de locuri (grilă a planului sălii)
- Rezervări cu posibilitate de modificare și anulare
- Notificări automate prin e-mail (confirmare, reminder 24h, modificare)
- Asistent AI conversațional cu acces la datele cinematografului (RAG)
- Panou administrativ complet — filme, săli, proiecții, utilizatori, statistici
- Autentificare JWT cu verificare e-mail la înregistrare
- Design responsiv pentru mobil, tabletă și desktop
- Teme clară și întunecată

## Ce am învățat

- Construirea unui API REST cu FastAPI și validare automată prin Pydantic
- Modelarea și interogarea unei baze de date relaționale cu SQLAlchemy și PostgreSQL
- Managementul stării globale în React prin Context API
- Implementarea autentificării securizate cu JWT și cookie-uri HTTP-only
- Containerizarea unei aplicații multi-serviciu cu Docker Compose și Nginx
- Integrarea unui model de limbaj local (Ollama/Gemma) folosind pattern-ul RAG
- Automatizarea task-urilor recurente cu APScheduler

## Pornire rapidă

```bash
git clone https://github.com/timibuhas/cinema-app.git
cd cinema-app
cp .env.example .env   # completează POSTGRES_PASSWORD și SECRET_KEY
docker compose up --build -d
```

Aplicația va fi disponibilă la [http://localhost](http://localhost).

## Demo video
https://youtu.be/TNIFVLiUuzE
