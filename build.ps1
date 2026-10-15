# Assemble les pages du site à partir de _src/ (contenu) et _src/partials/ (head, header, footer).
# Usage, depuis la racine du dépôt :
#   powershell -ExecutionPolicy Bypass -File build.ps1
# Chaque page source commence par un bloc de métadonnées :
#   <!--
#   title: Titre de la page
#   description: Description pour les moteurs de recherche
#   nav: home | parcours | projets | competences | veille | contact   (lien actif du menu)
#   base: /Portfolio/   (facultatif, utilisé par 404.html)
#   -->
# Un bloc <!--@head--> ... <!--@endhead--> est ajouté à la fin du <head>.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$src = Join-Path $root '_src'
$enc = New-Object System.Text.UTF8Encoding($false)
$siteUrl = 'https://kayzmat.github.io/Portfolio/'

$head = [IO.File]::ReadAllText("$src\partials\head.html", $enc)
$header = [IO.File]::ReadAllText("$src\partials\header.html", $enc)
$footer = [IO.File]::ReadAllText("$src\partials\footer.html", $enc)

foreach ($f in Get-ChildItem "$src\pages\*.html") {
  $t = [IO.File]::ReadAllText($f.FullName, $enc)
  $m = [regex]::Match($t, '(?s)^<!--\s*(.*?)-->')
  $meta = @{}
  foreach ($line in $m.Groups[1].Value -split "`r?`n") {
    if ($line -match '^\s*(\w+):\s*(.*)$') { $meta[$Matches[1]] = $Matches[2].Trim() }
  }
  $body = $t.Substring($m.Length)

  $extra = ''
  $hm = [regex]::Match($body, '(?s)<!--@head-->\r?\n(.*?)<!--@endhead-->\r?\n')
  if ($hm.Success) { $extra = $hm.Groups[1].Value; $body = $body.Remove($hm.Index, $hm.Length) }

  $page = if ($f.Name -eq 'index.html') { '' } else { $f.Name }
  $h = $head.Replace('{{TITLE}}', $meta.title).Replace('{{DESC}}', $meta.description.Replace('"', '&quot;')).Replace('{{URL}}', $siteUrl + $page)
  if ($meta.base) { $h = $h -replace '(<meta charset="UTF-8" />)', "`$1`n  <base href=`"$($meta.base)`" />" }

  $hdr = $header
  if ($meta.nav) { $hdr = $hdr.Replace("data-nav=`"$($meta.nav)`"", "data-nav=`"$($meta.nav)`" aria-current=`"page`"") }

  $out = "<!DOCTYPE html>`n<html lang=`"fr`">`n<head>`n$h$extra</head>`n<body>`n$hdr`n$($body.Trim("`r", "`n"))`n`n$footer</body>`n</html>`n"
  [IO.File]::WriteAllText((Join-Path $root $f.Name), ($out -replace "`r`n", "`n"), $enc)
  Write-Host "OK  $($f.Name)"
}
