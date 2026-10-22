@echo off
cd /d "C:\Users\USER\Downloads\My Projects\nexos"
call pnpm dev 1>>".logs\dev.out.log" 2>>".logs\dev.err.log"
