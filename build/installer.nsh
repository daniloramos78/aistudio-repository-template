; Instala por cima da versão anterior (mesmo appId/GUID), sem o usuário
; desinstalar à mão. O NSIS do electron-builder já remove a versão velha
; em silêncio (/S /KEEP_APP_DATA --updated) e copia os arquivos novos
; na mesma pasta, preservando atalhos e dados de campo.

!macro customHeader
  BrandingText "Planilha de Testes UFV — atualiza a versão já instalada"
!macroend

!macro customInit
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $0 == ""
    ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${EndIf}
  ${If} $0 != ""
  ${AndIf} ${FileExists} "$0\${APP_EXECUTABLE_FILENAME}"
    StrCpy $INSTDIR $0
  ${EndIf}
!macroend
