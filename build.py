#!/usr/bin/env python3
import os
import sys
import re

# Regex pattern to capture: /* {{include: path/to/file.ext}} */
INCLUDE_PATTERN = re.compile(r'/\*\s*\{\{\s*include:\s*([^\}]+)\s*\}\}\s*\*/')

def compile_html_file(template_path, output_path):
    """Reads a template file, recursively resolves any file inclusions, and writes the output."""
    if not os.path.exists(template_path):
        print(f"Error: Template not found at {template_path}")
        return False

    print(f"Processing template: {template_path}")
    
    with open(template_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    compiled_lines = []
    for line in lines:
        match = INCLUDE_PATTERN.search(line)
        if match:
            # Extract the path from the placeholder
            include_relative_path = match.group(1).strip()
            # Normalize the path relative to the project root directory
            include_absolute_path = os.path.abspath(include_relative_path)
            
            if os.path.exists(include_absolute_path):
                print(f"  -> Inlining: {include_relative_path}")
                with open(include_absolute_path, 'r', encoding='utf-8') as inc_file:
                    compiled_lines.append(inc_file.read() + "\n")
            else:
                print(f"  !! WARNING: File not found for inclusion: {include_relative_path}")
                compiled_lines.append(line) # Keep the placeholder if file missing
        else:
            compiled_lines.append(line)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(compiled_lines)
        
    print(f"Successfully compiled: {output_path}\n")
    return True

def get_all_app_directories():
    """Finds all subdirectories that contain an 'index.html' file, excluding 'shared' and 'dist'."""
    apps = []
    ignored_dirs = {'shared', 'dist', '.git', '__pycache__'}
    
    for entry in os.scandir('.'):
        if entry.is_dir() and entry.name not in ignored_dirs:
            if os.path.exists(os.path.join(entry.path, 'index.html')):
                apps.append(entry.name)
    return apps

def main():
    # Force working directory to be the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    apps_dir = os.path.join(script_dir, 'src/')
    dist_dir = os.path.join(script_dir, 'dist/')
    os.chdir(apps_dir)
    # Case 1: Specific app name provided as argument (e.g., `python3 build.py totp_app`)
    if len(sys.argv) > 1:
        target_app = sys.argv[1].rstrip('/')
        template = os.path.join(target_app, 'index.html')
        output = os.path.join(dist_dir, f"{target_app}.html")
        compile_html_file(template, output)
        
    # Case 2: No arguments, discover and build all apps automatically
    else:
        print("No target specified. Scanning workspace for single-file web apps...")
        apps = get_all_app_directories()
        
        if not apps:
            print("No app folders with an 'index.html' were found.")
            return

        print(f"Found {len(apps)} apps to compile: {', '.join(apps)}\n" + "-"*40)
        for app in apps:
            template = os.path.join(app, 'index.html')
            output = os.path.join(dist_dir, f"{app}.html")
            compile_html_file(template, output)

if __name__ == '__main__':
    main()