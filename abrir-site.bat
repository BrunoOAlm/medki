@echo off
title MedKi - servidor local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\servidor-site.ps1" -Port 8080
