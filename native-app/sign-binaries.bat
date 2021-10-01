@ECHO OFF

: Used by CoolSoft to sign native-app binary.
: Needed environment variables:
: SIGNTOOLPATH => points to folder containing "signtool.exe" in Windows Kit
:                 (like "c:\Program Files (x86)\Windows Kits\10\bin/10.0.17763.0\x86\signtool.exe")
: COOLSOFT_CA  => root folder of CoolSoft CA
:                 (containing "private\coolsoft.pfx" private certificate)

"%SIGNTOOLPATH%\signtool.exe" sign /f "%COOLSOFT_CA%\private\coolsoft.pfx" /tr http://timestamp.digicert.com "%1"
