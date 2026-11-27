@echo off
title MedKi - servidor local
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  py -3.12 -m venv .venv || goto erro
  .venv\Scripts\python.exe -m pip install -r requirements.lock || goto erro
)
.venv\Scripts\python.exe manage.py migrate || goto erro
.venv\Scripts\python.exe manage.py seed_demo || goto erro
start "" http://127.0.0.1:8000/
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
goto fim
:erro
echo Nao foi possivel iniciar o MedKi. Veja a mensagem acima.
pause
:fim
