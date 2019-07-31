@echo off

: check if NSISPATH environment variable is available
echo %NSISPATH%
if "%NSISPATH%"=="" (
  echo =======================================================
  echo ERROR: Missing NSISPATH environment variable
  echo Please define NSISPATH environment variable pointing to
  echo NSIS base path ^(the one containing \bin subfolder^)
  echo =======================================================
  pause
  exit /B 1
)

"%NSISPATH%\makensis.exe" /PAUSE windows-setup.nsi