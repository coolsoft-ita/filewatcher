; ===============================================================
; This file must be compiled with the Unicode version of NSIS 3.x
; ===============================================================
!if "${NSIS_PACKEDVERSION}" < 0x3008000
  !error "NSIS 3.08 or higher is required to build this installer!"
!endif
Unicode true
SetCompressor /solid lzma

!include "x64.nsh"
!include "WinVer.nsh"

; install as user
RequestExecutionLevel user

; General Symbol Definitions
!define COMPANY           "CoolSoft"
!define PRODUCT_SHORT     "FileWatcher"
!define PRODUCT           "${PRODUCT_SHORT} (Native application)"
!define EXEFILENAME       "FileWatcher.exe"
!define URL               "http://coolsoft.altervista.org"
!define URL_product       "http://coolsoft.altervista.org/filewatcher"
!define UNINSTALL_REGKEY  "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_SHORT}"
!define MANIFEST_FILE     "filewatcher-firefox.json"
!define FIREFOX_REGKEY    "Software\Mozilla\NativeMessagingHosts\filewatcher"
!define COPYRIGHT         "Copyright (C) 2021 by CoolSoft"

; The name of the installer
Name "${PRODUCT}"
BrandingText " "

; read version from version.h file
!searchparse /ignorecase /file "..\native-app\version.h" `#define APP_VERSION         "` VERSION `"`

; installer properties
CRCCheck on
XPStyle on
ShowInstDetails show
ShowUninstDetails show
VIProductVersion "${VERSION}.0"
VIAddVersionKey ProductName "${PRODUCT}"
VIAddVersionKey ProductVersion "${VERSION}.0"
VIAddVersionKey CompanyName "${COMPANY}"
VIAddVersionKey CompanyWebsite "${URL}"
VIAddVersionKey FileVersion "${VERSION}.0"
VIAddVersionKey FileDescription "${PRODUCT} setup file"
VIAddVersionKey LegalCopyright "${COPYRIGHT}"

; The file to write
OutFile "FileWatcher_NativeApp_${VERSION}.exe"

; Sign both installer and uninstaller
!finalize 'sleep 1 && ..\native-app\sign-binaries.bat "%1"' = 0
!uninstfinalize 'sleep 1 && ..\native-app\sign-binaries.bat "%1"' = 0

; MUI Symbol Definitions
!include MUI2.nsh

; MUI config
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; ===============
; Installer pages
; ===============
!define MUI_WELCOMEPAGE_TITLE_3LINES
!insertmacro MUI_PAGE_WELCOME
;!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE_3LINES
!insertmacro MUI_PAGE_FINISH

; =================
; Uninstaller pages
; =================
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ===================
; Installer languages
; ===================
!insertmacro MUI_LANGUAGE "English"     ; ID=1033


; common initialization function, called both by Installer and Uninstaller
!macro InitializeEnvironmentMacro un
Function ${un}InitializeEnvironment

  InitPluginsDir
  
  ; switch to x64 registry view by default in x64 OSes
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
 
  ; initialize $INSTDIR
  ${If} "$INSTDIR" == ""
    strcpy $INSTDIR "$PROFILE\.${PRODUCT_SHORT}"
  ${EndIf}

  ; continue setup
  
FunctionEnd
!macroend
!insertmacro InitializeEnvironmentMacro ""
!insertmacro InitializeEnvironmentMacro "un."


; Init function called by Installer
Function .oninit

  ; init the environment
  Call InitializeEnvironment
  
  ; ask for installer language
  !insertmacro MUI_LANGDLL_DISPLAY

  ; test operating system and service pack
  ${If} ${AtMostWinVista}
    MessageBox MB_OK|MB_ICONSTOP "${PRODUCT_SHORT} requires Windows 7 SP1 or newer to run."
    Abort
  ${EndIf}
  ${If} ${IsWin7}
  ${AndIf} ${AtMostServicePack} 0
    MessageBox MB_OK|MB_ICONSTOP "${PRODUCT_SHORT} requires Service Pack 1 to run."
    Abort
  ${EndIf}

FunctionEnd


; Init function called by Uninstaller
Function un.oninit
  ; init the environment
  Call un.InitializeEnvironment
FunctionEnd


; The stuff to install
Section "Main"

  ; Copy files
  SetOverwrite on
  CreateDirectory $INSTDIR
  SetOutPath $INSTDIR
  DetailPrint "Installing native application to $INSTDIR"

  ; copy native app files
  File ..\native-app\bin\${EXEFILENAME}
  
  ; create manifest file
  nsExec::ExecToStack '"$INSTDIR\${EXEFILENAME}" --manifest-ff'
  Pop $0
  Pop $1
  ${If} $0 == "error"
    DetailPrint "Error $0 creating manifest file"
    DetailPrint $1
  ${EndIf}
  FileOpen $2 "$INSTDIR\${MANIFEST_FILE}" w
  FileWrite $2 $1
  FileClose $2
  DetailPrint "Manifest created in $INSTDIR\${MANIFEST_FILE}"
  
  ; register native app
  WriteRegStr HKCU ${FIREFOX_REGKEY} "" '$INSTDIR\${MANIFEST_FILE}'

  ; NOTE: registry calls will be done to the proper registry view automatically,
  ; thanks to SetRegView in onInit().

  ; Write the uninstall keys
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "DisplayName" "${PRODUCT} ${VERSION}"
  WriteRegDWORD HKCU "${UNINSTALL_REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_REGKEY}" "NoRepair" 1
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "Publisher" "${COMPANY}"
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "Version" "${VERSION}"
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "URLInfoAbout" "${URL}"
  WriteRegStr   HKCU "${UNINSTALL_REGKEY}" "InstallLocation" "$INSTDIR"

  ; write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "${UNINSTALL_REGKEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'


SectionEnd


;--------------------------------
; Uninstaller
; -------------------------------
Section "Uninstall"

  ; unregister native app
  DeleteRegKey HKCU ${FIREFOX_REGKEY}

  ; Remove registry keys
  DeleteRegKey HKCU "${UNINSTALL_REGKEY}"
  
  ; remove installation dirs
  RMDir /r /REBOOTOK "$INSTDIR"
  
SectionEnd
