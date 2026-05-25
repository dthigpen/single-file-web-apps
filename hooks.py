import os
import shutil
import glob

# Copies the current single-file web apps from dist into docs/dist so they get copied to the static deployment

def on_config(config):
    source_dir = 'dist'
    target_dir = 'docs/dist'

    os.makedirs(target_dir, exist_ok=True)
    
    html_files = glob.glob(os.path.join(source_dir, '*.html'))
    
    if not html_files:
        print(f"Hooks Notice: No .html files found in '{source_dir}/' to copy.")
        return

    for file_path in html_files:
        file_name = os.path.basename(file_path)
        destination_path = os.path.join(target_dir, file_name)
        
        shutil.copy(file_path, destination_path)
        print(f"MkDocs Hook: Staged {file_path} -> {destination_path}")