#!/bin/bash
# Wrapper para que PM2 arranque el servidor de email vía shell en vez de
# directo con el interpreter de Node — evita que el auto-loader de env
# interno de PM2 7.x interfiera con process.env antes de que el script cargue.
cd "$(dirname "$0")"
exec node email-server.cjs
