<#
.SYNOPSIS
    Creates a desktop shortcut for Coding Agentic OS

.DESCRIPTION
    Creates a Windows shortcut on the user's desktop that launches the application
    via the Launch-Coding-Agentic-OS.cmd script.
#>

param(
    [string]$AppDir = "D:\Coding-Agentic-OS",
    [string]$ShortcutName = "Coding Agentic OS"
)

$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$ShortcutName.lnk"
$targetPath = Join-Path $AppDir "Launch-Coding-Agentic-OS.cmd"
$iconPath = Join-Path $AppDir "public\icon.ico"
$workingDir = $AppDir

if (-not (Test-Path $targetPath)) {
    Write-Error "Launcher script not found at $targetPath"
    exit 1
}

if (-not (Test-Path $iconPath)) {
    Write-Warning "Icon not found at $iconPath, using default"
    $iconPath = $null
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $workingDir
$shortcut.Description = "Local coding command centre for managing coding agents, tasks, projects, skills, and memory"
if ($iconPath) { $shortcut.IconLocation = $iconPath }
$shortcut.Save()

Write-Host "Shortcut created at: $shortcutPath"
Write-Host "Target: $targetPath"